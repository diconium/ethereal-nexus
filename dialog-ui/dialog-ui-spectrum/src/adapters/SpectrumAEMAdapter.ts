import {AEMAdapter as CoreAEMAdapter, AEMAdapterConfig} from '@ethereal-nexus/dialog-ui-core';
import {FieldValues} from '@ethereal-nexus/dialog-ui-core';

/**
 * AEM-specific adapter configuration for ui.spectrum package
 */
export interface SpectrumAEMAdapterConfig extends AEMAdapterConfig {
    /**
     * Custom headers to include in requests
     */
    customHeaders?: Record<string, string>;

    /**
     * Whether to enable debug logging
     */
    debug?: boolean;
}

/**
 * AEM adapter implementation specifically for the ui.spectrum package
 * Uses consolidated servlet for dialog operations with proper service user permissions
 */
export class SpectrumAEMAdapter extends CoreAEMAdapter {
    private spectrumConfig: SpectrumAEMAdapterConfig;

    constructor(config: SpectrumAEMAdapterConfig) {
        super(config);
        this.spectrumConfig = config;
    }

    /**
     * Get CSRF token from AEM
     */
    private async getCsrfToken(): Promise<string | null> {
        try {
            const response = await fetch(`${this.spectrumConfig.baseUrl}/libs/granite/csrf/token.json`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                return data.token;
            }
        } catch (error) {
            console.warn('Could not fetch CSRF token:', error);
        }
        return null;
    }

    /**
     * Enhanced save method for AEM using consolidated servlet
     * @param values The field values to save
     * @returns Promise that resolves when the values are saved
     */
    async saveFieldValues(values: FieldValues): Promise<void> {
        try {
            console.log('🚀 SpectrumAEMAdapter.saveFieldValues called with:', values);

            // Get CSRF token first
            const csrfToken = await this.getCsrfToken();
            console.log('🔐 CSRF Token obtained:', csrfToken ? 'Yes' : 'No');

            // Use the consolidated servlet endpoint
            const url = `${this.spectrumConfig.baseUrl}/bin/ethereal-nexus/dialog/save`;
            console.log('📡 POST URL:', url);

            // Transform the field values from our format to AEM format
            const aemValues = this.transformFieldValuesForCMS(values);
            console.log('🔄 Transformed values for AEM:', aemValues);

            // Prepare the request payload
            const payload = {
                componentPath: this.spectrumConfig.componentPath,
                componentType: this.spectrumConfig.componentType,
                containingPage: this.spectrumConfig.containingPage,
                values: aemValues,
                operation: 'save'
            };

            console.log('📦 Request payload:', payload);

            if (this.spectrumConfig.debug) {
                console.log('🐛 Debug mode - Saving to AEM:', payload);
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...this.getSpectrumHeaders(),
                ...this.spectrumConfig.customHeaders,
            };

            // Add CSRF token if available
            if (csrfToken) {
                headers['CSRF-Token'] = csrfToken;
            }

            console.log('📋 Request headers:', headers);

            // Make the request to our consolidated servlet
            console.log('🌐 Making fetch request...');
            const response = await fetch(url, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            console.log('📨 Response received:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                console.error('❌ Response not OK, trying to parse error...');
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error data from server:', errorData);
                throw new Error(`Failed to save field values: ${response.statusText}. ${errorData.error || ''}`);
            }

            const result = await response.json();
            console.log('✅ Success response from server:', result);

            if (this.spectrumConfig.debug) {
                console.log('🐛 AEM save response:', result);
            }

            if (!result.success) {
                console.error('❌ Server reported save failure:', result);
                throw new Error(result.error || 'Save operation failed');
            }

            console.log('🎉 Dialog content saved successfully to AEM!');
        } catch (error) {
            console.error('💥 Error in saveFieldValues:', error);
            console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            throw error;
        }
    }

    /**
     * Override the parent method to properly handle datamodel fields with cf_ prefix
     * @param values The field values to transform
     * @returns The transformed values for AEM
     */
    transformFieldValuesForCMS(values: FieldValues): any {
        console.log('🔧 [SpectrumAEMAdapter] Transforming field values for CMS:', values);
        console.log('🔧 [SpectrumAEMAdapter] Values keys:', Object.keys(values));
        console.log('🔧 [SpectrumAEMAdapter] Looking for datamodel fields...');

        const aemValues: Record<string, any> = {};

        // Process each property in our values
        Object.entries(values).forEach(([key, value]) => {
            console.log(`🔍 [SpectrumAEMAdapter] Processing field: ${key}, value:`, value);
            console.log(`🔍 [SpectrumAEMAdapter] Value type: ${typeof value}, isArray: ${Array.isArray(value)}`);

            // Handle arrays (multifield values)
            if (Array.isArray(value) && value.every(item => typeof item !== 'string')) {
                console.log(`📝 [SpectrumAEMAdapter] Processing multifield: ${key} with ${value.length} items`);
                // AEM expects multifield values to be submitted with specific naming
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        Object.entries(item).forEach(([itemKey, itemValue]) => {
                            if (itemKey === '__itemKey') return; // Skip internal display key
                            aemValues[`${key}/${index}/${itemKey}`] = itemValue;
                        });
                    } else {
                        aemValues[`${key}/${index}`] = item;
                    }
                });
            } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                console.log("📝 [SpectrumAEMAdapter] Processing multi-select dropdown:", key, value);
                aemValues[key] = value;
            }
            // Handle nested objects (but not datamodel fields)
            else if (value !== null && typeof value === 'object') {
                console.log(`🗂️ [SpectrumAEMAdapter] Processing nested object: ${key}`);
                Object.entries(this.transformFieldValuesForCMS(value)).forEach(([nestedKey, nestedValue]) => {
                    aemValues[`${key}/${nestedKey}`] = nestedValue;
                });
            }
            // Handle primitive values
            else {
                console.log(`✏️ [SpectrumAEMAdapter] Processing primitive value: ${key} = ${value}`);
                aemValues[key] = value;
            }
        });

        console.log('🎯 [SpectrumAEMAdapter] Final transformed values for AEM:', aemValues);
        console.log('🎯 [SpectrumAEMAdapter] Final values keys:', Object.keys(aemValues));
        return aemValues;
    }

    /**
     * Get enhanced headers for AEM requests
     * @returns The headers for AEM requests
     */
    private getSpectrumHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };

        // Add authentication headers if provided
        if (this.spectrumConfig.auth) {
            if (this.spectrumConfig.auth.token) {
                headers['Authorization'] = `Bearer ${this.spectrumConfig.auth.token}`;
            } else if (this.spectrumConfig.auth.username && this.spectrumConfig.auth.password) {
                const credentials = btoa(`${this.spectrumConfig.auth.username}:${this.spectrumConfig.auth.password}`);
                headers['Authorization'] = `Basic ${credentials}`;
            }
        }

        return headers;
    }
}
