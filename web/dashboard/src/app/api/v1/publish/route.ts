import { NextResponse } from 'next/server';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import { Buffer } from 'buffer';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { upsertAssets, upsertComponentWithVersion } from '@/data/components/actions';
import { EtherealStorage } from '@/storage/ethereal-storage';

const storage = new EtherealStorage();

export const POST = async (request) => {
  let conflictingAssets = false;
  const filesMap = new Map<string, string>()
  const user = await authenticatedWithApiKeyUser();

  const userId = user?.id;
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
    const result = await upsertComponentWithVersion(manifest, user.id);
    if (!result.success) {
      console.error(JSON.stringify(result.error, undefined, 2));
      return NextResponse.json(result.error.message, {
        status: HttpStatus.BAD_REQUEST
      });
    }

    const { id, slug, version } = result.data;

    for (const [fileName, content] of filesMap) {
      if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
        const urlObject = await storage.uploadToStorage(
          content,
          `${slug}/${version.version}`,
          fileName
        );

        if (!urlObject) {
          return NextResponse.json('Failed to upload assets', {
            status: HttpStatus.BAD_REQUEST
          });
        }

        let type: 'css' | 'js' | 'chunk' | 'server' = 'chunk' as const;
        if (fileName.endsWith('.css')) {
          type = 'css';
        } else if (fileName.endsWith('index.js')) {
          type = 'js';
        } else if (fileName.endsWith('server.js')) {
          type = 'server';
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
}
