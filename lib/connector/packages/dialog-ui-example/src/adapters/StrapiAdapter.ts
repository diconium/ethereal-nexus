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
 * Configuration for the Strapi adapter
 */
export interface StrapiAdapterConfig extends CMSAdapterConfig {
  /**
   * The base URL for Strapi API
   */
  baseUrl: string;

  /**
   * The content type name in Strapi
   */
  contentType: string;

  /**
   * The entry ID
   */
  entryId: string;

  /**
   * API token for Strapi
   */
  apiToken?: string;
}

/**
 * Strapi adapter implementation (mock for demo)
 */
export class StrapiAdapter implements CMSAdapter {
  private config: StrapiAdapterConfig;

  constructor(config: StrapiAdapterConfig) {
    this.config = config;
  }

  async getDialogStructure(): Promise<DialogStructure> {
    console.log('🔧 [StrapiAdapter] Fetching dialog structure from Strapi...');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    const mockStrapiResponse = {
      "data": {
        "attributes": {
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
        }
      }
    };

    return this.transformDialogStructure(mockStrapiResponse);
  }

  async getFieldValues(): Promise<FieldValues> {
    console.log('🔧 [StrapiAdapter] Fetching field values from Strapi...');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const mockValues = {
      data: {
        attributes: {
          toplabel: "Welcome to Strapi",
          title: "Strapi Headless CMS",
          description: "This content is managed by Strapi",
          group: {
            staticdropdownsingle: "three",
            ctalabel: "Get Started"
          }
        }
      }
    };

    return this.transformFieldValues(mockValues);
  }

  async saveFieldValues(values: FieldValues): Promise<void> {
    console.log('🔧 [StrapiAdapter] Saving field values to Strapi:', values);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 900));

    console.log('✅ [StrapiAdapter] Values saved successfully');
  }

  transformDialogStructure(strapiDialog: any): DialogStructure {
    return strapiDialog.data?.attributes?.dialog || [];
  }

  transformFieldValues(strapiData: any): FieldValues {
    return strapiData.data?.attributes || {};
  }

  transformFieldValuesForCMS(values: FieldValues): any {
    return {
      data: {
        attributes: values
      }
    };
  }
}
