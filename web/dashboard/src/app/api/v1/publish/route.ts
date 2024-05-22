import { NextResponse } from 'next/server';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import { Buffer } from 'buffer';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { HttpStatus } from '@/app/api/utils';
import { upsertAssets, upsertComponentWithVersion } from '@/data/components/actions';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import * as path from 'node:path';

export const POST = authenticatedWithKey(async (request, ext) => {
  let conflictingAssets = false;
  const filesMap = new Map<string, string>()

  const userId = ext?.user?.id;
  if (!userId) {
    return NextResponse.json('Api key not provided or invalid.', {
      status: HttpStatus.UNAUTHORIZED
    });
  }

  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data')) {
    return NextResponse.json('Invalid content type', {
      status: HttpStatus.BAD_REQUEST
    });
  }

  const data = await request.formData();
  const componentTar = data.get('file');

  if (!componentTar || typeof componentTar === 'string') {
    return NextResponse.json('File not provided', {
      status: HttpStatus.BAD_REQUEST
    });
  }

  try {
    const buffer = Buffer.from(await componentTar.arrayBuffer());
    const bufferStream = new PassThrough();
    bufferStream.end(buffer);

    const extract = tar.extract();
    extract.on('entry', (header, stream, next) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const fileContent = Buffer.concat(chunks);
        filesMap.set(header.name, fileContent.toString());
        next();
      });

      stream.resume();
    });

    // Use pipeline to handle the streams: buffer -> gunzip -> tar extract
    await pipeline(bufferStream, gunzip(), extract);
    const manifestFile = filesMap.get('./manifest.json');
    if (!manifestFile) {
      return NextResponse.json('No manifest present in the bundle.', {
        status: HttpStatus.BAD_REQUEST
      });
    }

    const manifest = JSON.parse(manifestFile);
    const result = await upsertComponentWithVersion(manifest);
    if (!result.success) {
      console.error(JSON.stringify(result.error, undefined, 2));
      return NextResponse.json(result.error.message, {
        status: HttpStatus.BAD_REQUEST
      });
    }

    const { id, slug, version } = result.data;

    for (const [fileName, content] of filesMap) {
      if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
        const { _response: { request: { url } } } = await uploadToStorage(
          content,
          slug!,
          version.version,
          fileName
        );

        if (!url) {
          return NextResponse.json('Failed to upload assets', {
            status: HttpStatus.BAD_REQUEST
          });
        }

        const urlObject = new URL(url);
        if (azFrontDoor) {
          urlObject.host = azFrontDoor;
        }

        let type: 'css' | 'js' | 'chunk' = 'chunk' as const;
        if (fileName.endsWith('.css')) {
          type = 'css';
        } else if (fileName.endsWith('index.js')) {
          type = 'js';
        }

        const response = await upsertAssets(
          id,
          version.id,
          urlObject.toString(),
          type
        );

        if (!response.success && response.error.message !== 'Asset already exists.') {
          return NextResponse.json('Failed to upsert assets', {
            status: HttpStatus.BAD_REQUEST
          });
        }

        if (!response.success && response.error.message === 'Asset already exists.') {
          conflictingAssets = true;
        }
      }
    }

    if(conflictingAssets) {
      return NextResponse.json('Some assets were already present.', {
          status: HttpStatus.CONFLICT,
        });
    }

    return NextResponse.json('File processed successfully.');
  } catch (err) {
    console.error(err);
    return NextResponse.json('Error processing file', {
      status: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }
});

const account = process.env.AZURE_BLOB_STORAGE_ACCOUNT || '';
const accountKey = process.env.AZURE_BLOB_STORAGE_SECRET || '';
const azFrontDoor = process.env.AZURE_FRONT_DOOR_URL || '';
const containerName =process.env.AZURE_CONTAINER_NAME  || 'remote-components-aem-demo';
const blobCacheControl = 'public, max-age=31536000';

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential,
);

const uploadToStorage = async (
  code: string,
  name: string,
  version: string,
  file: string,
) => {
  const containerClient = blobServiceClient.getContainerClient(
    containerName,
  );

  const blockBlobClient = containerClient.getBlockBlobClient(path.join(`${name}/${version}`, file));
  if (code) {
    return await blockBlobClient.upload(
      code,
      code.length,
      {
        blobHTTPHeaders: {
          blobContentType: `${
            file.endsWith('js')
              ? 'text/javascript'
              : 'text/css'
          }`,
          blobCacheControl: blobCacheControl,
        },
      },
    );
  } else {
    return Promise.reject({
      error: 'There was an issue uploading to storage',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};