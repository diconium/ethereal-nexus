import { SpectrumAEMAdapter, SpectrumAEMAdapterConfig } from '../adapters';
import { FieldValues } from '@ethereal-nexus/dialog-ui-core';

/**
 * Factory for creating AEM adapter instances
 */
export class SpectrumAEMAdapterFactory {
  /**
   * Create an AEM adapter instance from configuration
   * @param config The adapter configuration
   * @returns Configured AEM adapter instance
   */
  static create(config: SpectrumAEMAdapterConfig): SpectrumAEMAdapter {
    // Set default values
    const defaultConfig: Partial<SpectrumAEMAdapterConfig> = {
      debug: false,
      customHeaders: {
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
      }
    };

    const mergedConfig = { ...defaultConfig, ...config };
    return new SpectrumAEMAdapter(mergedConfig);
  }

  /**
   * Create an AEM adapter from DOM attributes (for web component usage)
   * @param element The DOM element containing configuration attributes
   * @returns Configured AEM adapter instance
   */
  static createFromElement(element: Element): SpectrumAEMAdapter | null {
    try {
      const baseUrl = element.getAttribute('data-base-url') || window.location.origin;
      const componentPath = element.getAttribute('data-component-path');
      const componentType = element.getAttribute('data-component-type');
      const containingPage = element.getAttribute('data-containing-page');

      if (!componentPath || !componentType || !containingPage) {
        console.error('Missing required attributes for AEM adapter');
        return null;
      }

      const config: SpectrumAEMAdapterConfig = {
        baseUrl,
        componentPath,
        componentType,
        containingPage,
        debug: false
      };

      // Add authentication if provided
      const username = element.getAttribute('data-auth-username');
      const password = element.getAttribute('data-auth-password');
      const token = element.getAttribute('data-auth-token');

      if (token) {
        config.auth = { token };
      } else if (username && password) {
        config.auth = { username, password };
      }

      return this.create(config);
    } catch (error) {
      console.error('Error creating AEM adapter from element:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}

/**
 * Hook for using AEM adapter in React components
 */
export function useSpectrumAEMAdapter(config: SpectrumAEMAdapterConfig) {
  const adapter = SpectrumAEMAdapterFactory.create(config);

  const saveContent = async (values: FieldValues) => {
    try {
      await adapter.saveFieldValues(values);
      return { success: true };
    } catch (error) {
      console.error('Error saving content:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  const loadContent = async () => {
    try {
      const values = await adapter.getFieldValues();
      return { success: true, values };
    } catch (error) {
      console.error('Error loading content:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    adapter,
    saveContent,
    loadContent
  };
}
