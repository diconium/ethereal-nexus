import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  getComponentByName,
  getComponentVersions,
  upsertAssets,
} from '@/data/components/actions';
import * as console from 'console';
import { EtherealStorage } from '@/storage/ethereal-storage';
import { randomUUID } from 'node:crypto';

const fileTypes: FileTypes = {
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
};

interface FileTypes {
  [key: string]: 'css' | 'js';
}

const storage = new EtherealStorage();

export const POST = async (
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ name: string; version: string; fileName: string }> },
) => {
  const user = await authenticatedWithApiKeyUser();
  const permissions = user?.permissions;
  if (permissions?.['components'] !== 'write') {
    return NextResponse.json(
      'You do not have permissions to write this resource.',
      {
        status: HttpStatus.FORBIDDEN,
      },
    );
  }
  try {
    const { name, version: requestVersion, fileName } = await params;
    if (!name || !requestVersion || !fileName) {
      return NextResponse.json('Invalid request. Missing params', {
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const headersList = await headers();
    const contentType = headersList.get('Content-Type') || '';
    const filePath: string = getFilePath(await params, contentType);
    const url = await uploadToStorage(request, filePath, contentType);

    if (!url) {
      return NextResponse.json('Failed to upload assets', {
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const component = await getComponentByName(name);
    if (!component.success) {
      return NextResponse.json('Component does not exist.', {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const versions = await getComponentVersions(component.data.id);
    if (!versions.success) {
      return NextResponse.json('No versions exist.', {
        status: HttpStatus.BAD_REQUEST,
      });
    }
    const version = versions.data.find(
      (version) => version.version === requestVersion,
    );
    if (!version) {
      return NextResponse.json('Version does not exist.', {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const response = await upsertAssets(
      component.data.id,
      version.id,
      url.toString(),
      fileTypes[contentType],
    );
    if (!response.success) {
      if (response.error.message === 'Asset already exists.') {
        return NextResponse.json(response.error.message, {
          status: HttpStatus.CONFLICT,
        });
      }

      return NextResponse.json('Failed to update assets', {
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return NextResponse.json(response.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json('Failed to put assets', {
      status: HttpStatus.BAD_REQUEST,
    });
  }
};

const uploadToStorage = async (
  request: any,
  filePath: string = 'index',
  contentType: string,
) => {
  const jsonData = request.body;
  let reader = jsonData.getReader();
  let readResult = await reader.read();
  let buffers: Uint8Array[] = [];
  try {
    while (!readResult.done) {
      if (readResult?.value) {
        buffers.push(readResult.value);
      }

      readResult = await reader.read();
    }
  } catch (e) {
    console.error(e);
  }

  // Convert Uint8Array[] to Buffer[] before concatenating
  const completeBuffer = Buffer.concat(buffers).toString();

  return storage.uploadToStorage(completeBuffer, filePath, contentType);
};

function getFilePath(
  {
    name,
    version,
    fileName = 'index',
  }: { name: string; version: string; fileName: string },
  contentType: string,
): string {
  const myUUID = randomUUID().replace(/-/g, '');
  return `${name}/${version}/${fileName}.${myUUID}.${fileTypes[contentType]}`;
}
