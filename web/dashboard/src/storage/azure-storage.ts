import path from 'node:path';
import { HttpStatus } from '@/app/api/utils';
import process from 'node:process';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import { IStorage } from '@/storage/ethereal-storage';

const account = process.env.AZURE_BLOB_STORAGE_ACCOUNT || '';
const accountKey = process.env.AZURE_BLOB_STORAGE_SECRET || '';
const azFrontDoor = process.env.AZURE_FRONT_DOOR_URL || '';
const containerName =process.env.AZURE_CONTAINER_NAME  || '';
const blobCacheControl = 'public, max-age=31536000';


export class AzureStorage implements IStorage {

  private blobServiceClient: BlobServiceClient;

  constructor() {
    const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      sharedKeyCredential,
    );
  }

  async uploadToStorage(code: string, name: string, file: string): Promise<URL> {
    const containerClient = this.blobServiceClient.getContainerClient(
      containerName,
    );

    const blockBlobClient = containerClient.getBlockBlobClient(path.join(name, file));
    if (code) {
      const { _response: { request: { url } } } = await blockBlobClient.upload(
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

      const urlObject = new URL(url);

      if (azFrontDoor) {
        urlObject.host = new URL(azFrontDoor).host;
      }

      return urlObject;
    } else {
      return Promise.reject({
        error: 'There was an issue uploading to storage',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

}