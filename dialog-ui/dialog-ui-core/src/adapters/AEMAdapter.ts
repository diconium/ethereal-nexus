import {DialogStructure, FieldValues, DialogField} from '../types';
import {CMSAdapter, CMSAdapterConfig} from './types';

/**
 * Configuration for the AEM adapter
 */
export interface AEMAdapterConfig extends CMSAdapterConfig {
    /**
     * The path to the component in AEM
     */
    componentPath: string;

    /**
     * The component type
     */
    componentType: string;

    /**
     * The containing page path
     */
    containingPage: string;
}

/**
 * AEM adapter implementation
 */
export class AEMAdapter implements CMSAdapter {
    private config: AEMAdapterConfig;

    constructor(config: AEMAdapterConfig) {
        this.config = config;
    }

    /**
     * Get the dialog structure from AEM
     * @returns Promise that resolves to the dialog structure
     */
    async getDialogStructure(): Promise<DialogStructure> {
        try {
            // Construct the URL for the remote component API
            const url = `${this.config.baseUrl}/bin/remote-components/component.json`;

            // Prepare the request parameters
            const params = new URLSearchParams({
                path: this.config.containingPage,
                type: this.config.componentType
            });

            // Make the request to AEM
            const response = await fetch(`${url}?${params.toString()}`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch dialog structure: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform the dialog structure from AEM format to our format
            return this.transformDialogStructure(data);
        } catch (error) {
            console.error('Error fetching dialog structure from AEM:', error);
            throw error;
        }
    }

    /**
     * Get the field values from AEM
     * @returns Promise that resolves to the field values
     */
    async getFieldValues(): Promise<FieldValues> {
        try {
            // Construct the URL for the content resource
            const url = `${this.config.baseUrl}${this.config.componentPath}.json`;

            // Make the request to AEM
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch field values: ${response.statusText}`);
            }

            const data = await response.json();

            // Transform the field values from AEM format to our format
            return this.transformFieldValues(data);
        } catch (error) {
            console.error('Error fetching field values from AEM:', error);
            throw error;
        }
    }

    /**
     * Save the field values to AEM
     * @param values The field values to save
     * @returns Promise that resolves when the values are saved
     */
    async saveFieldValues(values: FieldValues): Promise<void> {
        try {
            // Use our custom servlet endpoint for dialog content saving
            const url = `${this.config.baseUrl}/bin/ethereal-nexus/dialog/save`;

            // Transform the field values from our format to AEM format
            const aemValues = this.transformFieldValuesForCMS(values);

            // Prepare the request payload
            const payload = {
                componentPath: this.config.componentPath,
                componentType: this.config.componentType,
                containingPage: this.config.containingPage,
                values: aemValues,
                operation: 'save'
            };

            // Make the request to our custom AEM servlet
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getHeaders(),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to save field values: ${response.statusText}. ${errorData.message || ''}`);
            }

            const result = await response.json();
            console.log('Dialog content saved successfully:', result);
        } catch (error) {
            console.error('Error saving field values to AEM:', error);
            throw error;
        }
    }

    /**
     * Delete a component from AEM
     * @returns Promise that resolves when the component is deleted
     */
    async deleteComponent(): Promise<void> {
        try {
            const url = `${this.config.baseUrl}/bin/ethereal-nexus/dialog/delete`;

            const payload = {
                componentPath: this.config.componentPath,
                containingPage: this.config.containingPage,
                operation: 'delete'
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getHeaders(),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to delete component: ${response.statusText}. ${errorData.message || ''}`);
            }

            console.log('Component deleted successfully');
        } catch (error) {
            console.error('Error deleting component from AEM:', error);
            throw error;
        }
    }

    /**
     * Transform the dialog structure from AEM format to our format
     * @param aemDialog The dialog structure in AEM format
     * @returns The dialog structure in our format
     */
    transformDialogStructure(aemDialog: any): DialogStructure {
        // Check if the dialog is already in the expected format
        if (aemDialog.dialog && Array.isArray(aemDialog.dialog)) {
            return aemDialog.dialog;
        }

        // If not, transform it
        // This is a simplified implementation - in a real-world scenario,
        // you would need to handle all the different field types and properties
        const transformField = (field: any): DialogField => {
            return {
                ...field,
                // Add any transformations needed for specific field types
                children: field.children ? field.children.map(transformField) : null,
            };
        };

        // Extract the dialog array from the AEM response
        const dialogArray = aemDialog.dialog || [];

        // Transform each field
        return dialogArray.map(transformField);
    }

    /**
     * Transform the field values from AEM format to our format
     * @param aemData The field values in AEM format
     * @returns The field values in our format
     */
    transformFieldValues(aemData: any): FieldValues {
        console.log('🔧 [AEMAdapter] Transforming field values FROM AEM:', aemData);

        const transformedValues: FieldValues = {};

        // Check if we have a remote wrapper
        const remoteData = aemData.remote || aemData;
        console.log('🔧 [AEMAdapter] Processing remote data:', remoteData);

        if (remoteData && typeof remoteData === 'object') {
            Object.entries(remoteData).forEach(([key, value]) => {
                console.log(`🔍 [AEMAdapter] Processing field: ${key}, value:`, value);

                // Check if this is a cf_ prefixed datamodel field
                if (key.startsWith('cf_') && value && typeof value === 'object') {
                    const cfData = value as any;
                    console.log(`📋 [AEMAdapter] ✅ DETECTED CF_ DATAMODEL FIELD: ${key}`);
                    console.log(`📋 [AEMAdapter] CF field data:`, cfData);

                    // Extract the original field name (remove cf_ prefix)
                    const originalFieldName = key.substring(3); // Remove "cf_" prefix
                    console.log(`📋 [AEMAdapter] Original field name: ${originalFieldName}`);

                    // Extract fragmentPath from the cf_ node
                    if (cfData.fragmentPath) {
                        console.log(`📋 [AEMAdapter] Found fragmentPath: ${cfData.fragmentPath}`);
                        // Transform back to frontend format: { fragmentPath: "..." }
                        transformedValues[key] = {
                            fragmentPath: cfData.fragmentPath
                        };
                        console.log(`📋 [AEMAdapter] Transformed datamodel field: ${originalFieldName} =`, transformedValues[originalFieldName]);
                    } else {
                        console.warn(`⚠️ [AEMAdapter] CF field ${key} has no fragmentPath property`);
                    }
                }
                // Handle regular fields and multifields
                else if (value && typeof value === 'object') {
                    // This might be a multifield or nested object
                    console.log(`🗂️ [AEMAdapter] Processing nested object/multifield: ${key}`);
                    transformedValues[key] = this.transformNestedValue(value);
                }
                // Handle primitive values
                else {
                    console.log(`✏️ [AEMAdapter] Processing primitive value: ${key} = ${value}`);
                    transformedValues[key] = value;
                }
            });
        }

        console.log('🎯 [AEMAdapter] Final transformed values:', transformedValues);
        return transformedValues;
    }

    /**
     * Transform nested values (multifields, groups, etc.)
     * @param value The nested value to transform
     * @returns The transformed nested value
     */
    private transformNestedValue(value: any): any {
        if (Array.isArray(value)) {
            return value.map(item => this.transformNestedValue(item));
        }

        if (value && typeof value === 'object') {
            const transformedObject: any = {};

            Object.entries(value).forEach(([key, val]) => {
                // Handle cf_ prefixed fields in nested objects
                if (key.startsWith('cf_') && val && typeof val === 'object') {
                    const cfData = val as any;
                    const originalFieldName = key.substring(3);
                    if (cfData.fragmentPath) {
                        transformedObject[originalFieldName] = {
                            fragmentPath: cfData.fragmentPath
                        };
                    }
                } else {
                    transformedObject[key] = this.transformNestedValue(val);
                }
            });

            return transformedObject;
        }

        return value;
    }

    /**
     * Transform the field values from our format to AEM format
     * @param values The field values in our format
     * @returns The field values in AEM format
     */
    transformFieldValuesForCMS(values: FieldValues): any {
        // This is a simplified implementation - in a real-world scenario,
        // you would need to handle nested properties, arrays, etc.
        const aemValues: Record<string, any> = {};

        // Process each property in our values
        Object.entries(values).forEach(([key, value]) => {
            // Handle arrays (multifield values)
            if (Array.isArray(value)) {
                // AEM expects multifield values to be submitted with specific naming
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        Object.entries(item).forEach(([itemKey, itemValue]) => {
                            aemValues[`${key}/${index}/${itemKey}`] = itemValue;
                        });
                    } else {
                        aemValues[`${key}/${index}`] = item;
                    }
                });
            }
            // Handle nested objects
            else if (value !== null && typeof value === 'object') {
                Object.entries(this.transformFieldValuesForCMS(value)).forEach(([nestedKey, nestedValue]) => {
                    aemValues[`${key}/${nestedKey}`] = nestedValue;
                });
            }
            // Handle primitive values
            else {
                aemValues[key] = value;
            }
        });

        return aemValues;
    }

    /**
     * Get the headers for AEM requests
     * @returns The headers for AEM requests
     */
    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        // Add authentication headers if provided
        if (this.config.auth) {
            if (this.config.auth.token) {
                headers['Authorization'] = `Bearer ${this.config.auth.token}`;
            } else if (this.config.auth.username && this.config.auth.password) {
                const credentials = btoa(`${this.config.auth.username}:${this.config.auth.password}`);
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }

        return headers;
    }
}
