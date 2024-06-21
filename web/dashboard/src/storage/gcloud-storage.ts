import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { IStorage } from '@/storage/ethereal-storage';

const GCLOUD_BLOB_STORAGE_ID = process.env.GCLOUD_BLOB_STORAGE_ID || '';
const GCLOUD_BLOB_STORAGE_KEY_FILE= process.env.GCLOUD_BLOB_STORAGE_KEY_FILE || '';
const GCLOUD_BLOB_STORAGE_NAME = process.env.GCLOUD_BLOB_STORAGE_NAME || '';

export class GcloudStorage implements IStorage {

    private storage: Storage;

    constructor() {
       this.storage = new Storage({
        keyFilename: path.basename(GCLOUD_BLOB_STORAGE_KEY_FILE), // Path to your service account key file
        projectId: GCLOUD_BLOB_STORAGE_ID, // Your Google Cloud project ID
      });
    }

    async uploadToStorage(code: string, name: string, file: string): Promise<URL> {
      const fileName = path.join(name, file);
      const bucket = this.storage.bucket(GCLOUD_BLOB_STORAGE_NAME);
      await bucket.file(fileName).save(code);

      return new URL(`https://storage.googleapis.com/${GCLOUD_BLOB_STORAGE_NAME}/${fileName}`);
    }

}