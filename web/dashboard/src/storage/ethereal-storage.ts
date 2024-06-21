import { GcloudStorage } from '@/storage/gcloud-storage';
import { AzureStorage } from '@/storage/azure-storage';


export interface IStorage {

  uploadToStorage(code: string, name: string, file: string): Promise<URL>;

}

const STORAGE_TYPE = process.env.STORAGE_TYPE;

export class EtherealStorage implements IStorage {

  storage: IStorage;

  constructor() {

    switch (STORAGE_TYPE) {
      case 'gcloud': {
        this.storage = new GcloudStorage();
      } break;
      default: {
        this.storage = new AzureStorage();
      }
    }
  }

  uploadToStorage(code: string, name: string, file: string): Promise<URL> {
     return this.storage.uploadToStorage(code, name, file);
  }


}