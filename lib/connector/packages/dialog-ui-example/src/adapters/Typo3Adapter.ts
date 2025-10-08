import { DialogStructure, FieldValues } from '@ethereal-nexus/dialog-ui-core';

// Local interfaces since we can't import from dialog-ui-core adapters
interface CMSAdapterConfig {
  baseUrl?: string;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

interface CMSAdapter {
  getDialogStructure(): Promise<DialogStructure>;
  getFieldValues(): Promise<FieldValues>;
  saveFieldValues(values: FieldValues): Promise<void>;
}

/**
 * Configuration for the Typo3 adapter
 */
export interface Typo3AdapterConfig extends CMSAdapterConfig {
  /**
   * The base URL for Typo3
   */
  baseUrl: string;

  /**
   * The table name in Typo3
   */
  tableName: string;

  /**
   * The record UID
   */
  recordUid: string;

  /**
   * The field name for the dialog configuration
   */
  fieldName: string;
}

/**
 * Typo3 adapter implementation (mock for demo)
 */
export class Typo3Adapter implements CMSAdapter {
  private config: Typo3AdapterConfig;

  constructor(config: Typo3AdapterConfig) {
    this.config = config;
  }

  async getDialogStructure(): Promise<DialogStructure> {
    // Mock API call to Typo3
    console.log('🔧 [Typo3Adapter] Fetching dialog structure from Typo3...');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockTypo3Response = {
      "dialog": [
        {
          "id": "tabs",
          "type": "tabs",
          "children": [
            {
              "id": "tab_header",
              "type": "tab",
              "label": "Header",
              "children": [
                {
                  "id": "toplabel",
                  "name": "toplabel",
                  "type": "textfield",
                  "label": "Top Label",
                  "placeholder": "Top Label"
                },
                {
                  "id": "toplink",
                  "name": "toplink",
                  "type": "pathbrowser",
                  "label": "Top Link",
                  "folder": false,
                  "condition": {
                    "field": "toplabel",
                    "value": "batatas",
                    "operator": "eq"
                  },
                  "placeholder": "Top Link"
                }
              ]
            },
            {
              "id": "tab_body",
              "type": "tab",
              "label": "Body",
              "children": [
                {
                  "id": "title",
                  "name": "title",
                  "type": "textfield",
                  "label": "Title",
                  "placeholder": "Title"
                },
                {
                  "id": "description",
                  "name": "description",
                  "type": "textfield",
                  "label": "Description",
                  "placeholder": "Description"
                }
              ]
            },
            {
              "id": "tab_cta",
              "type": "tab",
              "label": "CTA",
              "children": [
                {
                  "id": "group",
                  "name": "group",
                  "type": "group",
                  "label": "Group Label",
                  "toggle": false,
                  "tooltip": "This is a tooltip for the whole group",
                  "children": [
                    {
                      "id": "staticdropdownsingle",
                      "name": "staticdropdownsingle",
                      "type": "select",
                      "label": "Static Dropdown",
                      "values": [
                        {
                          "label": "One",
                          "value": "one"
                        },
                        {
                          "label": "Two",
                          "value": "two"
                        },
                        {
                          "label": "Three",
                          "value": "three"
                        }
                      ],
                      "tooltip": "This is a static dropdown",
                      "multiple": false,
                      "placeholder": "Select an option"
                    },
                    {
                      "id": "ctalabel",
                      "name": "ctalabel",
                      "type": "textfield",
                      "label": "CTA Label",
                      "condition": {
                        "field": "group.staticdropdownsingle",
                        "value": "one",
                        "operator": "eq"
                      },
                      "placeholder": "CTA Label"
                    },
                    {
                      "id": "ctalink",
                      "name": "ctalink",
                      "type": "pathbrowser",
                      "label": "CTA Link",
                      "folder": false,
                      "condition": {
                        "field": "group.ctalabel",
                        "value": "batatas",
                        "operator": "eq"
                      },
                      "placeholder": "CTA Link"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    return this.transformDialogStructure(mockTypo3Response);
  }

  async getFieldValues(): Promise<FieldValues> {
    console.log('🔧 [Typo3Adapter] Fetching field values from Typo3...');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockValues = {
      toplabel: "Welcome to Typo3",
      title: "Typo3 Content",
      description: "This content comes from Typo3 CMS",
      group: {
        staticdropdownsingle: "two",
        ctalabel: "Learn More"
      }
    };

    return this.transformFieldValues(mockValues);
  }

  async saveFieldValues(values: FieldValues): Promise<void> {
    console.log('🔧 [Typo3Adapter] Saving field values to Typo3:', values);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('✅ [Typo3Adapter] Values saved successfully');
  }

  transformDialogStructure(typo3Dialog: any): DialogStructure {
    return typo3Dialog.dialog || [];
  }

  transformFieldValues(typo3Data: any): FieldValues {
    return typo3Data;
  }

  transformFieldValuesForCMS(values: FieldValues): any {
    return values;
  }
}
