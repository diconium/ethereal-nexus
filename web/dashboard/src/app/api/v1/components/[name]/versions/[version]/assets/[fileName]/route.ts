import { HttpStatus } from '@/app/api/utils';
import { headers } from 'next/headers';
import { AuthenticatedWithApiKeyUser, authenticatedWithKey, DefaultExt } from '@/lib/route-wrappers';
import { NextRequest, NextResponse } from 'next/server';
import { getComponentByName, getComponentVersions, upsertAssets } from '@/data/components/actions';
import * as console from 'console';
import { v4 as uuidv4 } from 'uuid';
import { EtherealStorage } from '@/storage/ethereal-storage';

const fileTypes: FileTypes = {
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
};

interface FileTypes {
  [key: string]: 'css' | 'js';
}


const storage = new EtherealStorage();

/**
 * @swagger
 * /api/v1/components/{name}/versions/{version}/assets/{fileName}:
 *   post:
 *     summary: add component asset
 *     description: Add component asset
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     requestBody:
 *      content:
 *          text/javascript:
 *            schema:
 *              type: string
 *              format: binary
 *          text/css:
 *            schema:
 *              type: string
 *              format: binary
 *     parameters:
 *      - in: path
 *        name: name
 *        description: The component's name
 *        required: true
 *        type: string
 *      - in: path
 *        name: version
 *        description: The component's version
 *        required: true
 *        type: string
 *      - in: path
 *        name: fileName
 *        description: The asset file name
 *        required: false
 *        type: string
 *     responses:
 *      '200':
 *        description: The component's info
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           $ref: '#/components/schemas/Component'
 *      '404':
 *        description: Not Found
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Not Found - the component does not exist
 *      '500':
 *        description: Internal Server Error
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Internal Server Error - Something went wrong on the server side
 */
export const POST = authenticatedWithKey(
  async (
    request: NextRequest,
    ext:
      | { params: { name: string; version: string; fileName: string } } & DefaultExt & AuthenticatedWithApiKeyUser
      | undefined,
  ) => {
    const permissions = ext?.user.permissions;
    if (permissions?.['components'] !== 'write') {
      return NextResponse.json('You do not have permissions to write this resource.', {
        status: HttpStatus.FORBIDDEN,
      });
    }
    try {
      const params = ext?.params || {
        name: undefined,
        version: undefined,
        fileName: undefined,
      };
      if (!params?.name || !params.version || !params.fileName) {
        return NextResponse.json('Invalid request. Missing params', {
          status: HttpStatus.BAD_REQUEST,
        });
      }
      const headersList = headers();
      const contentType = headersList.get('Content-Type') || '';
      const filePath: string = getFilePath(params, contentType);
      const url = await uploadToStorage(
        request,
        filePath,
        contentType,
      );

      if (!url) {
        return NextResponse.json('Failed to upload assets', {
          status: HttpStatus.BAD_REQUEST,
        });
      }
      const component = await getComponentByName(params.name);
      if(!component.success){
        return NextResponse.json('Component does not exist.', {
          status: HttpStatus.BAD_REQUEST,
        });
      }

      const versions = await getComponentVersions(component.data.id);
      if(!versions.success){
        return NextResponse.json('No versions exist.', {
          status: HttpStatus.BAD_REQUEST,
        });
      }
      const version = versions.data.find(version => version.version === params.version)
      if(!version){
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
        if(response.error.message === 'Asset already exists.') {
          return NextResponse.json(response.error.message, {
            status: HttpStatus.CONFLICT,
          });
        }

        return NextResponse.json('Failed to update assets', {
          status: HttpStatus.BAD_REQUEST,
        });
      }
      return NextResponse.json(response.data);
    } catch(err) {
      console.error(err)
      return NextResponse.json('Failed to put assets', {
        status: HttpStatus.BAD_REQUEST,
      });
    }
  },
);

const uploadToStorage = async (
  request: any,
  filePath: string = 'index',
  contentType: string,
) => {
  const jsonData = request.body;
  let reader = jsonData.getReader();
  let readResult = await reader.read();
  let buffers: Buffer[] = [];
  try {
    while (!readResult.done) {
      if (readResult?.value) {
        buffers.push(Buffer.from(readResult.value));
      }

      readResult = await reader.read();
    }
  } catch (e) {
    console.error(e);
  }
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
  const myUUID = uuidv4().replace(/-/g, '');
  return `${name}/${version}/${fileName}.${myUUID}.${fileTypes[contentType]}`;
}
