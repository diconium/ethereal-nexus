import { GcloudStorage } from '@/storage/gcloud-storage';
import { AzureStorage } from '@/storage/azure-storage';

export interface IStorage {
  /**
   * Update to storage and return bundle URL
   * @param code
   * @param name
   * @param file
   */
  uploadToStorage(code: string, name: string, file: string): Promise<URL>;
}

const STORAGE_TYPE = process.env.STORAGE_TYPE;

export class EtherealStorage implements IStorage {
  storage: IStorage;

  constructor() {
    switch (STORAGE_TYPE) {
      case 'gcloud':
        this.storage = new GcloudStorage();
        break;
      case 'azure':
      default:
        this.storage = new AzureStorage();
        break;
    }
  }

  uploadToStorage(code: string, name: string, file: string): Promise<URL> {
    return this.storage.uploadToStorage(code, name, file);
  }
}
