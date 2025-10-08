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
 * Configuration for the Mock AEM adapter (simulates web component data attributes)
 */
export interface MockAEMAdapterConfig extends CMSAdapterConfig {
  /**
   * The base URL for AEM (optional for mock)
   */
  baseUrl?: string;

  /**
   * The dialog structure from data attributes
   */
  dialogData?: string;

  /**
   * The field values from data attributes
   */
  valuesData?: string;
}

/**
 * Mock AEM adapter implementation (simulates getting data from web component data attributes)
 */
export class MockAEMAdapter implements CMSAdapter {
  // @ts-ignore
  private config: MockAEMAdapterConfig;

  constructor(config: MockAEMAdapterConfig) {
    this.config = config;
  }

  async getDialogStructure(): Promise<DialogStructure> {
    console.log('🔧 [MockAEMAdapter] Getting dialog structure from data attributes...');

    // Simulate reading from data attributes
    await new Promise(resolve => setTimeout(resolve, 200));

    const mockDataAttribute = {
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

    return this.transformDialogStructure(mockDataAttribute);
  }

  async getFieldValues(): Promise<FieldValues> {
    console.log('🔧 [MockAEMAdapter] Getting field values from data attributes...');

    // Simulate reading from data attributes
    await new Promise(resolve => setTimeout(resolve, 100));

    const mockValues = {
      toplabel: "AEM Web Component",
      title: "Adobe Experience Manager",
      description: "Content from AEM data attributes",
      group: {
        staticdropdownsingle: "one",
        ctalabel: "Explore AEM"
      }
    };

    return this.transformFieldValues(mockValues);
  }

  async saveFieldValues(values: FieldValues): Promise<void> {
    console.log('🔧 [MockAEMAdapter] Saving field values via AEM API:', values);

    // Simulate API call to AEM servlet
    await new Promise(resolve => setTimeout(resolve, 1200));

    console.log('✅ [MockAEMAdapter] Values saved successfully');
  }

  transformDialogStructure(aemDialog: any): DialogStructure {
    return aemDialog.dialog || [];
  }

  transformFieldValues(aemData: any): FieldValues {
    return aemData;
  }

  transformFieldValuesForCMS(values: FieldValues): any {
    return values;
  }
}
