import { DEFAULT_HEADERS, HttpStatus } from "@/app/api/utils";
import {Component, ComponentAsset} from "@/app/api/v1/components/model";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { headers } from "next/headers";
import mongooseDb, { Collection } from "@/lib/mongodb";

const fileTypes: FileTypes = {
  "text/css": "css",
  "text/javascript": "js",
  "application/javascript": "js",
};

interface FileTypes {
  [key: string]: string;
}

const account = process.env.AZURE_BLOB_STORAGE_ACCOUNT || "";
const accountKey = process.env.AZURE_BLOB_STORAGE_SECRET || "";

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

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential,
);

type AssetUploadParams = Pick<Component, "name" | "version"> & { fileName: string };

export async function POST(
  request: Request,
  { params }: { params: AssetUploadParams },
) {
  try {
    const headersList = headers();
    const contentType = headersList.get("Content-Type") || "";
    const filePath: string = getFilePath(params, contentType);
    const { _response } = await uploadToStorage(
      request,
      filePath,
      contentType,
    );
    const { request: responseFromBlob = {} as any } = _response;
    const { url } = responseFromBlob;

    if (url) {
      await updateDBComponentAssets({ params, contentType, url });
    }
  } catch (e: any) {
    return new Response(null, {
      status: e.statusCode,
      headers: DEFAULT_HEADERS,
    });
  }
  return new Response(null, {
    status: HttpStatus.OK,
    headers: DEFAULT_HEADERS,
  });
}

const uploadToStorage = async (
  request: Request,
  filePath: string = "index",
  contentType: string,
) => {
  const containerClient = blobServiceClient.getContainerClient(
    "remote-components-aem-demo",
  );

  const jsonData = request.body;
  const reader = jsonData?.getReader();

  if(!reader){
    return Promise.reject({
      error: "There was no valid content found to upload",
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  let readResult = await reader.read();
  const buffers: Buffer[] = [];
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

  const blockBlobClient = containerClient.getBlockBlobClient(filePath);
  if (buffers.length) {
    const completeBuffer = Buffer.concat(buffers);
    return await blockBlobClient.upload(
      completeBuffer.toString(),
      completeBuffer.toString().length,
      { blobHTTPHeaders: { blobContentType: `${contentType === 'application/javascript' ? 'text/javascript' : contentType}` } },
    );
  } else {
    return Promise.reject({
      error: "There was an issue uploading to storage",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

function getFilePath(
  { name, version, fileName = "index" }: AssetUploadParams,
  contentType: string,
): string {
  return `${name}/${version}/${fileName}.${fileTypes[contentType]}`;
}

async function updateDBComponentAssets({
  params,
  contentType,
  url,
}: {
  params: AssetUploadParams;
  contentType: string;
  url: string;
}) {
  const { name, version } = params;

  if (!name || !version) {
    return Promise.reject({
      error: "missing name or version in params",
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }

  const db = await mongooseDb();

  const component =
    (await db
      .collection<Component>(Collection.COMPONENTS)
      .findOne({ name: params.name, version: params.version })) || ({} as Partial<Component>);

  const { assets = []} = component;

  const otherAssets = assets.filter(
    (asset: ComponentAsset) => asset.filePath !== url,
  );

  const updated: ComponentAsset = { type: fileTypes[contentType] , filePath: url };


  const newObject = {
    ...component,
    assets: [...otherAssets, updated],
  };

  return await db
    .collection(Collection.COMPONENTS)
    .replaceOne({ name: params.name, version: params.version }, newObject);
}
