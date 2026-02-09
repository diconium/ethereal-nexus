import { DialogStructure, FieldValues } from '../types';

/**
 * Interface for CMS adapters
 * This defines the contract that all CMS adapters must implement
 */
export interface CMSAdapter {
  /**
   * Get the dialog structure from the CMS
   * @returns Promise that resolves to the dialog structure
   */
  getDialogStructure(): Promise<DialogStructure>;
  
  /**
   * Get the field values from the CMS
   * @returns Promise that resolves to the field values
   */
  getFieldValues(): Promise<FieldValues>;
  
  /**
   * Save the field values to the CMS
   * @param values The field values to save
   * @returns Promise that resolves when the values are saved
   */
  saveFieldValues(values: FieldValues): Promise<void>;

  /**
   * Delete a component from the CMS
   * @returns Promise that resolves when the component is deleted
   */
  deleteComponent?(): Promise<void>;

  /**
   * Transform the dialog structure from the CMS format to our format
   * @param cmsDialog The dialog structure in CMS format
   * @returns The dialog structure in our format
   */
  transformDialogStructure(cmsDialog: any): DialogStructure;

  /**
   * Transform the field values from the CMS format to our format
   * @param cmsValues The field values in CMS format
   * @returns The field values in our format
   */
  transformFieldValues(cmsValues: any): FieldValues;

  /**
   * Transform the field values from our format to the CMS format
   * @param values The field values in our format
   * @returns The field values in CMS format
   */
  transformFieldValuesForCMS(values: FieldValues): any;
}

/**
 * Base configuration for all CMS adapters
 */
export interface CMSAdapterConfig {
  /**
   * The base URL of the CMS
   */
  baseUrl: string;
  
  /**
   * Authentication credentials for the CMS
   */
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  
  /**
   * Additional options for the CMS adapter
   */
  options?: Record<string, any>;
}
