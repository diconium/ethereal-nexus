import { NextResponse } from 'next/server';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import { Buffer } from 'buffer';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { HttpStatus } from '@/app/api/utils';
import { upsertAssets, upsertComponent } from '@/data/components/actions';

export const POST = authenticatedWithKey(async (request, ext) => {
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
        filesMap.set(header.name, fileContent.toString())
        next();
      });

      stream.resume();
    });

    // Use pipeline to handle the streams: buffer -> gunzip -> tar extract
    await pipeline(bufferStream, gunzip(), extract);
    const manifest = filesMap.get('./manifest.json')
    if(!manifest) {
      return NextResponse.json('No manifest present in the bundle.', {
        status: HttpStatus.BAD_REQUEST
      });
    }

    // TODO: implement asset upload logic
    // upsertComponent()
    // uploadBLob()
    // const response = await upsertAssets(
    //   params.name,
    //   params.version,
    //   url,
    //   fileTypes[contentType],
    // );

    return NextResponse.json('File processed successfully');
  } catch (err) {
    console.error(err);
    return NextResponse.json('Error processing file', {
      status: HttpStatus.INTERNAL_SERVER_ERROR
    });
  }
});