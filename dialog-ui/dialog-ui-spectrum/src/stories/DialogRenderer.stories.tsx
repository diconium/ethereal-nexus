import type {Meta, StoryObj} from '@storybook/react-vite';
import React from 'react';

// Import the DialogRendererReact component directly for better Storybook integration
import {DialogRendererReact} from '../components/DialogRendererWebComponent';

// Define the props interface for better type safety in Storybook
interface DialogRendererProps {
    config?: string;
    'data-config'?: string;
    'content-resource'?: string;
    'data-content-resource'?: string;
    onSubmit?: (data: any) => void;
    onCancel?: () => void;
}

// Wrapper component for Storybook that handles the React component directly
const DialogRendererWrapper: React.FC<DialogRendererProps> = (props) => {
    const handleSubmit = (data: any) => {
        console.log('Dialog submitted:', data);
        if (props.onSubmit) {
            props.onSubmit(data);
        }
    };

    return (
        <DialogRendererReact
            {...props}
            onSubmit={handleSubmit}
        />
    );
};

const meta: Meta<typeof DialogRendererWrapper> = {
    title: 'Components/DialogRenderer',
    component: DialogRendererWrapper,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'A React component that renders AEM dialog configurations as forms. Can handle both simple DialogConfig format and AEM field array format.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        config: {
            control: 'text',
            description: 'JSON string of DialogConfig format'
        },
        'data-config': {
            control: 'text',
            description: 'Alternative attribute name for JSON configuration (AEM field array format)'
        },
        'content-resource': {
            control: 'text',
            description: 'JSON string of AEM content resource data to populate form values'
        },
        'data-content-resource': {
            control: 'text',
            description: 'Alternative attribute name for content resource'
        },
        onSubmit: {
            action: 'submitted',
            description: 'Callback function called when form is submitted'
        },
        onCancel: {
            action: 'cancelled',
            description: 'Callback function called when form is cancelled'
        }
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Simple DialogConfig format example
export const SimpleDialogConfig: Story = {
    args: {
        config: JSON.stringify({
            fields: [
                {
                    name: 'title',
                    type: 'textfield',
                    label: 'Title',
                    required: true,
                    placeholder: 'Enter title...'
                },
                {
                    name: 'description',
                    type: 'textfield',
                    label: 'Description',
                    placeholder: 'Enter description...'
                }
            ]
        })
    },
};

// AEM Field Array Format - based on test-components.html
export const AEMFieldArrayFormat: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "items",
                "_id": null,
                "title": null,
                "label": "Banners",
                "itemLabelKey": null,
                "folder": false,
                "path": "/content",
                "placeholder": "",
                "min": "",
                "max": "",
                "startday": "",
                "tooltip": null,
                "url": null,
                "method": "POST",
                "allowedMimeTypes": ["image/gif", "image/jpeg", "image/png", "image/tiff", "image/svg+xml"],
                "multiple": false,
                "showastoggle": false,
                "required": false,
                "children": [
                    {
                        "type": "multifield",
                        "id": "nested",
                        "_id": null,
                        "title": null,
                        "label": "Nested",
                        "itemLabelKey": null,
                        "folder": false,
                        "path": "/content",
                        "placeholder": "",
                        "min": "",
                        "max": "",
                        "startday": "",
                        "tooltip": null,
                        "url": null,
                        "method": "POST",
                        "allowedMimeTypes": ["image/gif", "image/jpeg", "image/png", "image/tiff", "image/svg+xml"],
                        "multiple": false,
                        "showastoggle": false,
                        "required": false,
                        "children": [
                            {
                                "type": "textfield",
                                "id": "title",
                                "_id": null,
                                "title": null,
                                "label": "Title",
                                "itemLabelKey": null,
                                "folder": false,
                                "path": "/content",
                                "placeholder": "Title",
                                "min": "",
                                "max": "",
                                "startday": "",
                                "tooltip": null,
                                "url": null,
                                "method": "POST",
                                "allowedMimeTypes": ["image/gif", "image/jpeg", "image/png", "image/tiff", "image/svg+xml"],
                                "multiple": false,
                                "showastoggle": false,
                                "required": false,
                                "children": null,
                                "values": null,
                                "condition": null,
                                "parent": null,
                                "displayformat": "",
                                "headerformat": "",
                                "valueformat": "",
                                "defaultValue": "",
                                "body": null,
                                "pageProperties": null
                            }
                        ],
                        "values": null,
                        "condition": null,
                        "parent": null,
                        "displayformat": "",
                        "headerformat": "",
                        "valueformat": "",
                        "defaultValue": "",
                        "body": null,
                        "pageProperties": null
                    }
                ],
                "values": null,
                "condition": null,
                "parent": null,
                "displayformat": "",
                "headerformat": "",
                "valueformat": "",
                "defaultValue": "",
                "body": null,
                "pageProperties": null
            }
        ])
    },
};

// AEM Field Array with Content Resource - based on test-components.html
export const WithContentResource: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "items",
                "label": "Banners",
                "required": false,
                "children": [
                    {
                        "type": "multifield",
                        "id": "nested",
                        "label": "Nested",
                        "required": false,
                        "children": [
                            {
                                "type": "textfield",
                                "id": "title",
                                "label": "Title",
                                "placeholder": "Title",
                                "required": false
                            }
                        ]
                    }
                ]
            }
        ]),
        'content-resource': JSON.stringify({
            "remoteComponentType": "nested",
            "jcr:lastModifiedBy": "admin",
            "jcr:created": 1753786309123,
            "jcr:createdBy": "admin",
            "jcr:lastModified": 1754306359703,
            "sling:resourceType": "remote-components/components/remotecomponent",
            "jcr:primaryType": "nt:unstructured",
            "remote": {
                "jcr:primaryType": "nt:unstructured",
                "items": {
                    "item0": {
                        "jcr:primaryType": "nt:unstructured",
                        "remote": {
                            "jcr:primaryType": "nt:unstructured",
                            "nested": {
                                "item0": {
                                    "jcr:primaryType": "nt:unstructured",
                                    "remote": {
                                        "jcr:primaryType": "nt:unstructured",
                                        "title": "1"
                                    }
                                },
                                "jcr:primaryType": "nt:unstructured"
                            }
                        }
                    },
                    "jcr:primaryType": "nt:unstructured"
                }
            },
            "remoteComponentTitle": "Nested"
        })
    },
};

// Complex multifield example with different field types
export const ComplexMultifield: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "banners",
                "label": "Banner Items",
                "required": false,
                "children": [
                    {
                        "type": "textfield",
                        "id": "title",
                        "label": "Banner Title",
                        "required": true,
                        "placeholder": "Enter banner title"
                    },
                    {
                        "type": "textfield",
                        "id": "subtitle",
                        "label": "Banner Subtitle",
                        "required": false,
                        "placeholder": "Enter banner subtitle"
                    },
                    {
                        "type": "select",
                        "id": "type",
                        "label": "Banner Type",
                        "values": [
                            {"value": "hero", "label": "Hero Banner"},
                            {"value": "promotion", "label": "Promotion Banner"},
                            {"value": "info", "label": "Info Banner"}
                        ]
                    }
                ]
            }
        ]),
        'content-resource': JSON.stringify({
            "remote": {
                "banners": {
                    "item0": {
                        "remote": {
                            "title": "Welcome Banner",
                            "subtitle": "Get started with our amazing features",
                            "type": "hero"
                        }
                    },
                    "item1": {
                        "remote": {
                            "title": "Special Offer",
                            "subtitle": "50% off this month only",
                            "type": "promotion"
                        }
                    }
                }
            }
        })
    },
};


export const NavigationInsideMultifield: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "navigationItems",
                "label": "Navigation Items",
                "required": false,
                "itemLabelKey": "item_name",
                "children": [
                      {
                        "id": "item_name",
                        "name": "item_name",
                        "type": "textfield",
                        "label": "nexus.item_name.label"
                      },
                      {
                        "id": "entry_point",
                        "name": "entry_point",
                        "type": "navigation",
                        "label": "nexus.top-navigation.navigation",
                        "tooltip": "nexus.top-navigation.navigation.tooltip",
                        "showRootLevel": true,
                        "pageProperties": [
                          {
                            "label": "nexus.top-navigation.teaser.information",
                            "value": "teaser.*"
                          },
                          {
                            "label": "nexus.top-navigation.teaser.image",
                            "value": "cq:teaserImage.*"
                          },
                          {
                            "label": "nexus.top-navigation.subtitle",
                            "value": "subtitle"
                          },
                          {
                            "label": "nexus.top-navigation.hide_overview_page",
                            "value": "hidePageOverview"
                          },
                          {
                            "label": "nexus.top-navigation.new_tab",
                            "value": "openInNewTab"
                          },
                          {
                            "label": "nexus.top-navigation.is_new",
                            "value": "isNew"
                          },
                          {
                            "label": "nexus.top-navigation.is_new_expiry_date",
                            "value": "isNewExpiryDate"
                          }
                        ],
                        "showChildrenCheckbox": true
                      }
                    ]
            }
        ]),
        'content-resource': JSON.stringify({
            "remote": {
                "navigationItems": {
                    "item0": {
                      "item_name": "Navigation Item 1",
                      "nav_entry_point" : {
                        "structureDepth" : "3",
                        "collectAllPages" : "true",
                        "structureStart" : "1",
                        "navigationRoot" : "/content/page1",
                        "jcr:primaryType" : "nt:unstructured"
                      },
                    },
                   "item2": {
                      "item_name": "Navigation Item 2",
                      "nav_entry_point" : {
                        "structureDepth" : "3",
                        "collectAllPages" : "false",
                        "structureStart" : "1",
                        "navigationRoot" : "/content/page2",
                        "jcr:primaryType" : "nt:unstructured"
                      },
                  },

                }
            }
        })
    },
};


export const WithRichTextEditor: Story = {
  args: {
    'data-config': JSON.stringify({
      "fields": [
        {
          "id": "text",
          "name": "text",
          "type": "richtexteditor",
          "label": "nexus.text.label",
          "tooltip": "nexus.003.text.tooltip",
          "placeholder": "nexus.text.placeholder"
        },
        {
          "id": "type",
          "name": "type",
          "type": "select",
          "label": "nexus.type_size.label",
          "values": [
            {
              "label": "SP3",
              "value": "SP3"
            },
            {
              "label": "SP4",
              "value": "SP4"
            },
            {
              "label": "SP5",
              "value": "SP5"
            },
            {
              "label": "SP6",
              "value": "SP6"
            }
          ],
          "tooltip": "nexus.003.type.tooltip",
          "multiple": false,
          "defaultValue": "SP6"
        },
        {
          "id": "color",
          "url": "/bin/api/filter-by-tenant",
          "body": {
            "scs": [
              {
                "label": "nexus.color.blue",
                "value": "blue"
              },
              {
                "label": "nexus.color.turquoise",
                "value": "turquoise"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ],
            "smm": [
              {
                "label": "nexus.color.blue",
                "value": "blue"
              },
              {
                "label": "nexus.color.turquoise",
                "value": "turquoise"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ],
            "sms": [
              {
                "label": "nexus.color.sky",
                "value": "sky"
              },
              {
                "label": "nexus.color.dark-blue",
                "value": "dark-blue"
              },
              {
                "label": "nexus.color.fountain",
                "value": "fountain"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ],
            "spa": [
              {
                "label": "nexus.color.violet",
                "value": "violet"
              },
              {
                "label": "nexus.color.orange",
                "value": "orange"
              },
              {
                "label": "nexus.color.yellow",
                "value": "yellow"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ],
            "sps": [
              {
                "label": "nexus.color.green",
                "value": "green"
              },
              {
                "label": "nexus.color.emerald",
                "value": "emerald"
              },
              {
                "label": "nexus.color.purple",
                "value": "purple"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ],
            "default": [
              {
                "label": "nexus.color.blue",
                "value": "blue"
              },
              {
                "label": "nexus.color.dark-blue",
                "value": "dark-blue"
              },
              {
                "label": "nexus.color.sky",
                "value": "sky"
              },
              {
                "label": "nexus.color.purple",
                "value": "purple"
              },
              {
                "label": "nexus.color.emerald",
                "value": "emerald"
              },
              {
                "label": "nexus.color.violet",
                "value": "violet"
              },
              {
                "label": "nexus.color.orange",
                "value": "orange"
              },
              {
                "label": "nexus.color.yellow",
                "value": "yellow"
              },
              {
                "label": "nexus.color.green",
                "value": "green"
              },
              {
                "label": "nexus.color.fountain",
                "value": "fountain"
              },
              {
                "label": "nexus.color.turquoise",
                "value": "turquoise"
              },
              {
                "label": "nexus.color.red",
                "value": "red"
              },
              {
                "label": "nexus.color.white",
                "value": "white"
              },
              {
                "label": "nexus.color.black",
                "value": "black"
              },
              {
                "label": "nexus.color.dark-gray-2",
                "value": "dark-gray-2"
              }
            ]
          },
          "name": "color",
          "type": "datasource",
          "label": "nexus.color.label",
          "method": "POST",
          "tooltip": "nexus.003.color.tooltip",
          "multiple": false,
          "defaultValue": "dark-gray-2"
        }
      ]
    })
  },
};

// Error state - invalid config
export const InvalidConfig: Story = {
    args: {
        'data-config': 'invalid json string'
    },
};

// Empty config
export const EmptyConfig: Story = {
    args: {
        'data-config': ''
    },
};

// Test story with exact content-resource structure from test-components.html
export const TestComponentsExample: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "items",
                "label": "Banners",
                "required": false,
                "children": [
                    {
                        "type": "multifield",
                        "id": "nested",
                        "label": "Nested",
                        "required": false,
                        "children": [
                            {
                                "type": "textfield",
                                "id": "title",
                                "label": "Title",
                                "placeholder": "Title",
                                "required": false
                            }
                        ]
                    }
                ]
            }
        ]),
        'content-resource': JSON.stringify({
            "remoteComponentType": "nested",
            "jcr:lastModifiedBy": "admin",
            "jcr:created": 1753786309123,
            "jcr:createdBy": "admin",
            "jcr:lastModified": 1754306359703,
            "sling:resourceType": "remote-components/components/remotecomponent",
            "jcr:primaryType": "nt:unstructured",
            "remote": {
                "jcr:primaryType": "nt:unstructured",
                "items": {
                    "item0": {
                        "jcr:primaryType": "nt:unstructured",
                        "remote": {
                            "jcr:primaryType": "nt:unstructured",
                            "nested": {
                                "item0": {
                                    "jcr:primaryType": "nt:unstructured",
                                    "remote": {
                                        "jcr:primaryType": "nt:unstructured",
                                        "title": "1"
                                    }
                                },
                                "jcr:primaryType": "nt:unstructured"
                            }
                        }
                    },
                    "jcr:primaryType": "nt:unstructured"
                }
            },
            "remoteComponentTitle": "Nested"
        })
    },
};

// Enhanced version with multiple items to test the mapping thoroughly
export const EnhancedNestedMultifield: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "multifield",
                "id": "items",
                "label": "Items",
                "required": false,
                "children": [
                    {
                        "type": "textfield",
                        "id": "itemTitle",
                        "label": "Item Title",
                        "placeholder": "Enter item title",
                        "required": false
                    },
                    {
                        "type": "multifield",
                        "id": "nested",
                        "label": "Nested Items",
                        "required": false,
                        "children": [
                            {
                                "type": "textfield",
                                "id": "title",
                                "label": "Nested Title",
                                "placeholder": "Enter nested title",
                                "required": false
                            },
                            {
                                "type": "textfield",
                                "id": "description",
                                "label": "Nested Description",
                                "placeholder": "Enter description",
                                "required": false
                            }
                        ]
                    }
                ]
            }
        ]),
        'content-resource': JSON.stringify({
            "remoteComponentType": "nested",
            "jcr:lastModifiedBy": "admin",
            "jcr:created": 1753786309123,
            "jcr:createdBy": "admin",
            "jcr:lastModified": 1754306359703,
            "sling:resourceType": "remote-components/components/remotecomponent",
            "jcr:primaryType": "nt:unstructured",
            "remote": {
                "jcr:primaryType": "nt:unstructured",
                "items": {
                    "item0": {
                        "jcr:primaryType": "nt:unstructured",
                        "remote": {
                            "jcr:primaryType": "nt:unstructured",
                            "itemTitle": "First Item",
                            "nested": {
                                "item0": {
                                    "jcr:primaryType": "nt:unstructured",
                                    "remote": {
                                        "jcr:primaryType": "nt:unstructured",
                                        "title": "Nested Title 1",
                                        "description": "First nested description"
                                    }
                                },
                                "item1": {
                                    "jcr:primaryType": "nt:unstructured",
                                    "remote": {
                                        "jcr:primaryType": "nt:unstructured",
                                        "title": "Nested Title 2",
                                        "description": "Second nested description"
                                    }
                                },
                                "jcr:primaryType": "nt:unstructured"
                            }
                        }
                    },
                    "item1": {
                        "jcr:primaryType": "nt:unstructured",
                        "remote": {
                            "jcr:primaryType": "nt:unstructured",
                            "itemTitle": "Second Item",
                            "nested": {
                                "item0": {
                                    "jcr:primaryType": "nt:unstructured",
                                    "remote": {
                                        "jcr:primaryType": "nt:unstructured",
                                        "title": "Another nested title",
                                        "description": "Another nested description"
                                    }
                                },
                                "jcr:primaryType": "nt:unstructured"
                            }
                        }
                    },
                    "jcr:primaryType": "nt:unstructured"
                }
            },
            "remoteComponentTitle": "Nested"
        })
    },
};

// Tabs example with grouped and non-grouped content
export const TabsExample: Story = {
    args: {
        'data-config': JSON.stringify([
            {
                "type": "tabs",
                "id": "tabs",
                "label": "Dialog Tabs",
                "required": false,
                "children": [
                    {
                        "type": "tab",
                        "id": "tab_grouped",
                        "label": "Grouped",
                        "required": false,
                        "children": [
                            {
                                "type": "group",
                                "id": "group",
                                "label": "Group Label",
                                "tooltip": "This is a tooltip for the whole group",
                                "required": false,
                                "children": [
                                    {
                                        "type": "textfield",
                                        "id": "grouptitle",
                                        "label": "Group Title",
                                        "placeholder": "Group Title",
                                        "required": false
                                    },
                                    {
                                        "type": "checkbox",
                                        "id": "isadvanced",
                                        "label": "Advanced",
                                        "tooltip": "Check this box to show advanced options",
                                        "required": false
                                    },
                                    {
                                        "type": "select",
                                        "id": "staticdropdownsingle",
                                        "label": "Static Dropdown",
                                        "placeholder": "Select an option",
                                        "tooltip": "This is a static dropdown",
                                        "required": false,
                                        "values": [
                                            {"value": "one", "label": "One"},
                                            {"value": "two", "label": "Two"},
                                            {"value": "three", "label": "Three"}
                                        ]
                                    }
                                ]
                            },
                            {
                                "type": "multifield",
                                "id": "banners",
                                "label": "Banners",
                                "required": false,
                                "children": [
                                    {
                                        "type": "textfield",
                                        "id": "title",
                                        "label": "Title",
                                        "placeholder": "Title",
                                        "required": false
                                    },
                                    {
                                        "type": "checkbox",
                                        "id": "isadvanced",
                                        "label": "Advanced",
                                        "tooltip": "Check this box to show advanced options",
                                        "required": false
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "tab",
                        "id": "tab_nongrouped",
                        "label": "Non Grouped",
                        "required": false,
                        "children": [
                            {
                                "type": "textfield",
                                "id": "person",
                                "label": "Person",
                                "placeholder": "Select a person",
                                "tooltip": "This is a person",
                                "required": true
                            },
                            {
                                "type": "multifield",
                                "id": "contributors",
                                "label": "Contributors",
                                "required": false,
                                "children": [
                                    {
                                        "type": "textfield",
                                        "id": "person",
                                        "label": "Person",
                                        "placeholder": "Select a person",
                                        "tooltip": "This is a person",
                                        "required": true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ])
    },
};
