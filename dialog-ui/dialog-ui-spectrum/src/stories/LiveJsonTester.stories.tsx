import type {Meta, StoryObj} from '@storybook/react-vite';
import React, {useState, useRef} from 'react';
import {
    DialogTrigger,
    ActionButton,
    Dialog,
    Heading,
    Header,
    Divider,
    Content,
    Text,
    View,
    TextArea,
    Flex,
    Button,
    Switch
} from '@adobe/react-spectrum';
import {EnhancedDialogBody} from '../components/EnhancedDialogBody';
import Play from '@spectrum-icons/workflow/Play';
import Refresh from '@spectrum-icons/workflow/Refresh';

// Default dialog configuration for testing
const DEFAULT_DIALOG_CONFIG = {
    id: 'test-dialog',
    title: 'Test Dialog',
    fields: [
        {
            "type": "datasource",
            "id": "color",
            "_id": null,
            "title": null,
            "label": "nexus.color.label",
            "itemLabelKey": null,
            "folder": false,
            "path": "/content",
            "placeholder": "",
            "min": "",
            "max": "",
            "startday": "",
            "tooltip": "nexus.006.color.tooltip",
            "url": "/bin/api/filter-by-tenant",
            "method": "POST",
            "allowedMimeTypes": [
                "image/gif",
                "image/jpeg",
                "image/png",
                "image/tiff",
                "image/svg+xml"
            ],
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
            "defaultValue": "black",
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
            "pageProperties": null
        },
        {
            type: "richtexteditor",
            id: "text",
            label: "Rich Text Content",
            placeholder: "Enter your content here...",
            tooltip: "Main content area with rich text formatting"
        },
        {
            type: "datamodel",
            id: "person",
            name: "person",
            label: "Person",
            placeholder: "Select a person",
            tooltip: "This is a person",
            required: true
        },
        {
            type: "textfield",
            id: "title",
            name: "title",
            label: "Title",
            placeholder: "Enter title"
        },
        {
            type: "checkbox",
            id: "enabled",
            name: "enabled",
            label: "Enabled"
        },
        {
            "type": "select",
            "id": "staticdropdownmultiple",
            "label": "Static Dropdown Multiple",
            "path": "/content",
            "placeholder": "Select an option",
            "tooltip": "This is a static dropdown",
            "multiple": true,
            "showastoggle": false,
            "required": false,
            "children": null,
            "values": [
                {
                    "value": "one",
                    "label": "One"
                },
                {
                    "value": "two",
                    "label": "Two"
                },
                {
                    "value": "three",
                    "label": "Three"
                }
            ],
            "defaultValue": [
                "one",
                "two"
            ],
        },
        {
            type: "group",
            id: "settings_group",
            name: "settings_group",
            label: "Settings Group",
            tooltip: "Group of settings",
            children: [
                {
                    type: "richtexteditor",
                    id: "text",
                    label: "Rich Text Content",
                    placeholder: "Enter your content here...",
                    tooltip: "Main content area with rich text formatting"
                },
                {
                    type: "textfield",
                    id: "settings_group",
                    name: "settings_group",
                    label: "settings_group"
                },
                {
                    type: "textfield",
                    id: "description",
                    name: "description",
                    label: "Description"
                },
                {
                    type: "datamodel",
                    id: "person",
                    name: "person",
                    label: "Person",
                    placeholder: "Select a person",
                    tooltip: "This is a person",
                    required: true
                },
            ]
        }
    ]
};

// Default initial values for testing
const DEFAULT_INITIAL_VALUES = {
    title: "Sample Title",
    staticdropdownmultiple: ["three"],
    enabled: true,
    "cf_person": {
        "fragmentPath": "/content/dam/ethereal-nexus-demo-65/rui"
    },
    "person": {
        "fragmentPath": "WRONG"
    },
    "settings_group": {
        active: true,
        "cf_person": {
            "fragmentPath": "/correct/path"
        }
    }
};

// Interactive JSON Dialog Tester with live value updates
const LiveJsonDialogTester: React.FC = () => {
    const [dialogConfigJson, setDialogConfigJson] = useState(JSON.stringify(DEFAULT_DIALOG_CONFIG, null, 2));
    const [initialValuesJson, setInitialValuesJson] = useState(JSON.stringify(DEFAULT_INITIAL_VALUES, null, 2));
    const [parsedDialog, setParsedDialog] = useState<any>(DEFAULT_DIALOG_CONFIG);
    const [currentFormData, setCurrentFormData] = useState<any>(DEFAULT_INITIAL_VALUES);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showLiveEditor, setShowLiveEditor] = useState(true);
    const [showCurrentValues, setShowCurrentValues] = useState(false);
    const dialogKey = useRef(0);

    const parseJsonInputs = () => {
        try {
            const dialog = JSON.parse(dialogConfigJson);
            const initialValues = JSON.parse(initialValuesJson);

            setParsedDialog(dialog);
            setCurrentFormData(initialValues); // Set form data to initial values
            setParseError(null);
            setIsDialogOpen(true);
            dialogKey.current += 1; // Force re-render of dialog
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
            setParseError(`JSON Parse Error: ${errorMessage}`);
        }
    };

    const updateInitialValues = () => {
        try {
            const newInitialValues = JSON.parse(initialValuesJson);
            setCurrentFormData(newInitialValues); // Reset form data to new initial values
            setParseError(null);
            dialogKey.current += 1; // Force re-render with new values
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
            setParseError(`Values Update Error: ${errorMessage}`);
        }
    };

    const handleFormDataChange = (newFormData: any) => {
        // Just update the current form data, don't touch the JSON textarea
        setCurrentFormData(newFormData);
    };

    const loadComplexExample = () => {
        const complexDialog = {
            id: 'complex-dialog',
            title: 'Multifield Test Dialog',
            fields: [
                {
                    type: "tabs",
                    id: "tabs",
                    name: "tabs",
                    label: "Tabs",
                    children: [
                        {
                            type: "tab",
                            id: "tab_grouped",
                            name: "tab_grouped",
                            label: "Grouped",
                            children: [
                                {
                                    type: "group",
                                    id: "group",
                                    name: "group",
                                    label: "Group Label",
                                    tooltip: "This is a tooltip for the whole group",
                                    children: [
                                        {
                                            type: "media",
                                            id: "media",
                                            name: "media",
                                            label: "Media",
                                            allowedMimeTypes: ["application/pdf", "application/zip"]
                                        },
                                        {
                                            type: "textfield",
                                            id: "grouptitle",
                                            name: "grouptitle",
                                            label: "Group Title",
                                            placeholder: "Group Title"
                                        },
                                        {
                                            type: "checkbox",
                                            id: "isadvanced",
                                            name: "isadvanced",
                                            label: "Advanced",
                                            tooltip: "Check this box to show advanced options"
                                        },
                                        {
                                            type: "calendar",
                                            id: "event",
                                            name: "event",
                                            label: "Event Date",
                                            placeholder: "Choose a date",
                                            min: "2024-02-01",
                                            max: "2024-02-09",
                                            tooltip: "This is the Event date picker"
                                        },
                                        {
                                            type: "select",
                                            id: "staticdropdownsingle",
                                            name: "staticdropdownsingle",
                                            label: "Static Dropdown",
                                            placeholder: "Select an option",
                                            tooltip: "This is a static dropdown",
                                            options: [
                                                {value: "one", label: "One"},
                                                {value: "two", label: "Two"},
                                                {value: "three", label: "Three"}
                                            ],
                                            defaultValue: "one"
                                        },
                                        {
                                            type: "select",
                                            id: "staticdropdownmultiple",
                                            name: "staticdropdownmultiple",
                                            label: "Static Multiselect Dropdown",
                                            placeholder: "Select at least one option",
                                            tooltip: "This is a static Multiselect dropdown",
                                            multiple: true,
                                            options: [
                                                {value: "one", label: "One"},
                                                {value: "two", label: "Two"},
                                                {value: "three", label: "Three"}
                                            ],
                                            defaultValue: ["one", "two"]
                                        },
                                        {
                                            type: "pathbrowser",
                                            id: "link",
                                            name: "link",
                                            label: "Link",
                                            placeholder: "Link"
                                        },
                                        {
                                            type: "multifield",
                                            id: "banners",
                                            name: "banners",
                                            label: "Banners",
                                            children: [
                                                {
                                                    type: "textfield",
                                                    id: "title",
                                                    name: "title",
                                                    label: "Title",
                                                    placeholder: "Title"
                                                },
                                                {
                                                    type: "checkbox",
                                                    id: "isadvanced",
                                                    name: "isadvanced",
                                                    label: "Advanced",
                                                    tooltip: "Check this box to show advanced options"
                                                },
                                                {
                                                    type: "media",
                                                    id: "image",
                                                    name: "image",
                                                    label: "Image",
                                                    allowedMimeTypes: ["image/gif", "image/jpeg", "image/png", "image/tiff", "image/svg+xml"]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "tab",
                            id: "tab_nongrouped",
                            name: "tab_nongrouped",
                            label: "Non Grouped",
                            children: [

                                {
                                    type: "textfield",
                                    id: "title",
                                    name: "title",
                                    label: "Title",
                                    placeholder: "Title"
                                },
                                {
                                    type: "datamodel",
                                    id: "person",
                                    name: "person",
                                    label: "Person",
                                    placeholder: "Select a person",
                                    tooltip: "This is a person",
                                    required: true
                                },
                                {
                                    type: "calendar",
                                    id: "anotherevent",
                                    name: "anotherevent",
                                    label: "Another Event Date",
                                    placeholder: "Choose a date",
                                    tooltip: "This is the Event date picker"
                                },
                                {
                                    type: "multifield",
                                    id: "anothermultifield",
                                    name: "anothermultifield",
                                    label: "Nested",
                                    itemLabelKey: "title",
                                    children: [
                                        {
                                            type: "textfield",
                                            id: "title",
                                            name: "title",
                                            label: "Title",
                                            placeholder: "Title"
                                        },

                                        {
                                            type: "datamodel",
                                            id: "person",
                                            name: "person",
                                            label: "Person",
                                            placeholder: "Select a person",
                                            tooltip: "This is a person",
                                            required: true
                                        },
                                        {
                                            type: "checkbox",
                                            id: "isadvanced",
                                            name: "isadvanced",
                                            label: "Advanced",
                                            tooltip: "Check this box to show advanced options"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "tab",
                            id: "tags",
                            name: "tags",
                            label: "Tags",
                            children: [

                                {
                                    type: "textfield",
                                    id: "tags",
                                    name: "tags",
                                    label: "Tags",
                                    placeholder: "Tags (comma separated)"
                                },


                            ]
                        }
                    ]
                }
            ]
        };

        const complexValues = {
            "group": {
                "active": true,
                "grouptitle": "Grouped Title 1234",
                "isadvanced": false,
                "staticdropdownsingle": "one",
                "staticdropdownmultiple": ["one", "two"],
                "banners": [
                    {
                        "title": "Sample Banner",
                        "isadvanced": false
                    }
                ],
            },
            "cf_person": {
                "fragmentPath": "/content/dam/ethereal-nexus-demo-65/rui"
            },
            "anothermultifield": [
                {
                    "title": "Sample Nested Item",
                    "isadvanced": true,
                    "cf_person": {
                        "fragmentPath": "/content/dam/ethereal-nexus-demo-65/rui"
                    }
                }
            ]
        };

        setDialogConfigJson(JSON.stringify(complexDialog, null, 2));
        setInitialValuesJson(JSON.stringify(complexValues, null, 2));
        setParseError(null);
    };

    const loadNexusContentExample = () => {
        const nexusContentDialog = {
            id: 'nexus-content-dialog',
            title: 'Nexus Content Component',
            fields: [
                {
                    type: "tabs",
                    id: "tabs",
                    label: "Content Tabs",
                    children: [
                        {
                            type: "tab",
                            id: "tab_nexus.settings.label",
                            label: "Settings",
                            children: [
                                {
                                    type: "select",
                                    id: "intro_alignment",
                                    label: "Header Alignment",
                                    tooltip: "Choose the alignment for the header content",
                                    options: [
                                        {value: "left", label: "Left"},
                                        {value: "middle", label: "Center"},
                                        {value: "right", label: "Right"}
                                    ]
                                },
                                {
                                    type: "select",
                                    id: "content_alignment",
                                    label: "Content Alignment",
                                    tooltip: "Choose the alignment for the main content",
                                    options: [
                                        {value: "left", label: "Left"},
                                        {value: "middle", label: "Center"},
                                        {value: "right", label: "Right"}
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "animations",
                                    label: "Animation Settings",
                                    children: [
                                        {
                                            type: "select",
                                            id: "animation",
                                            label: "Parallax Animation",
                                            tooltip: "Select an animation style",
                                            options: [
                                                {value: "none", label: "None"},
                                                {value: "preset_1", label: "Animation One"},
                                                {value: "preset_2", label: "Animation Two"}
                                            ],
                                            defaultValue: "none"
                                        }
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "container_id",
                                    label: "Anchor Settings",
                                    children: [
                                        {
                                            type: "textfield",
                                            id: "name",
                                            label: "Anchor ID",
                                            placeholder: "#",
                                            tooltip: "Add an anchor ID for deep linking"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "tab",
                            id: "tab_nexus.content.label",
                            label: "Content",
                            children: [
                                {
                                    type: "group",
                                    id: "eyebrow",
                                    label: "Eyebrow Text",
                                    children: [
                                        {
                                            type: "textfield",
                                            id: "eyebrow",
                                            label: "Eyebrow",
                                            placeholder: "Enter eyebrow text",
                                            tooltip: "Small text that appears above the main headline"
                                        },
                                        {
                                            type: "select",
                                            id: "tag",
                                            label: "HTML Tag",
                                            tooltip: "Select the semantic HTML tag",
                                            options: [
                                                {value: "h1", label: "h1"},
                                                {value: "h2", label: "h2"},
                                                {value: "h3", label: "h3"},
                                                {value: "h4", label: "h4"},
                                                {value: "h5", label: "h5"},
                                                {value: "h6", label: "h6"},
                                                {value: "p", label: "p"}
                                            ]
                                        },
                                        {
                                            type: "select",
                                            id: "type",
                                            label: "Type Size",
                                            tooltip: "Choose the typography size",
                                            options: [
                                                {value: "SP3", label: "SP3"},
                                                {value: "SP4", label: "SP4"}
                                            ],
                                            defaultValue: "SP3"
                                        },
                                        {
                                            type: "select",
                                            id: "color",
                                            label: "Color",
                                            tooltip: "Select text color",
                                            options: [
                                                {value: "blue", label: "Blue"},
                                                {value: "turquoise", label: "Turquoise"},
                                                {value: "red", label: "Red"},
                                                {value: "white", label: "White"},
                                                {value: "black", label: "Black"},
                                                {value: "dark-gray-2", label: "Dark Gray"}
                                            ],
                                            defaultValue: "black"
                                        },
                                        {
                                            type: "pathbrowser",
                                            id: "link",
                                            label: "Link",
                                            placeholder: "Enter link URL",
                                            tooltip: "Optional link for the eyebrow text"
                                        },
                                        {
                                            type: "textfield",
                                            id: "anchor",
                                            label: "Anchor",
                                            placeholder: "#",
                                            tooltip: "Anchor link for internal navigation"
                                        },
                                        {
                                            type: "checkbox",
                                            id: "new_tab",
                                            label: "Open in New Tab"
                                        }
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "headline",
                                    label: "Main Headline",
                                    children: [
                                        {
                                            type: "textfield",
                                            id: "headline",
                                            label: "Headline Text",
                                            placeholder: "Enter main headline",
                                            tooltip: "The primary headline for this section"
                                        },
                                        {
                                            type: "select",
                                            id: "tag",
                                            label: "HTML Tag",
                                            tooltip: "Select the semantic HTML tag",
                                            options: [
                                                {value: "h1", label: "h1"},
                                                {value: "h2", label: "h2"},
                                                {value: "h3", label: "h3"},
                                                {value: "h4", label: "h4"},
                                                {value: "h5", label: "h5"},
                                                {value: "h6", label: "h6"},
                                                {value: "p", label: "p"}
                                            ],
                                            defaultValue: "h1"
                                        },
                                        {
                                            type: "select",
                                            id: "type",
                                            label: "Type Size",
                                            tooltip: "Choose the typography size",
                                            options: [
                                                {value: "SP0", label: "SP0"},
                                                {value: "SP1", label: "SP1"}
                                            ],
                                            defaultValue: "SP0"
                                        },
                                        {
                                            type: "checkbox",
                                            id: "italic",
                                            label: "Italic Style"
                                        }
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "text",
                                    label: "Body Content",
                                    children: [
                                        {
                                            type: "richtexteditor",
                                            id: "text",
                                            label: "Rich Text Content",
                                            placeholder: "Enter your content here...",
                                            tooltip: "Main content area with rich text formatting"
                                        },
                                        {
                                            type: "select",
                                            id: "type",
                                            label: "Type Size",
                                            tooltip: "Choose the typography size for body text",
                                            options: [
                                                {value: "SP3", label: "SP3"},
                                                {value: "SP4", label: "SP4"},
                                                {value: "SP5", label: "SP5"},
                                                {value: "SP6", label: "SP6"}
                                            ],
                                            defaultValue: "SP6"
                                        }
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "button",
                                    label: "Call to Action Button",
                                    children: [
                                        {
                                            type: "select",
                                            id: "type",
                                            label: "Button Type",
                                            tooltip: "Choose button style and size",
                                            options: [
                                                {value: "primary-sm", label: "Primary Small"},
                                                {value: "primary-md", label: "Primary Medium"},
                                                {value: "primary-lg", label: "Primary Large"},
                                                {value: "primary-xl", label: "Primary Extra Large"},
                                                {value: "secondary-sm", label: "Secondary Small"},
                                                {value: "secondary-md", label: "Secondary Medium"},
                                                {value: "secondary-lg", label: "Secondary Large"},
                                                {value: "secondary-xl", label: "Secondary Extra Large"},
                                                {value: "tertiary-sm", label: "Tertiary Small"},
                                                {value: "tertiary-md", label: "Tertiary Medium"},
                                                {value: "tertiary-lg", label: "Tertiary Large"},
                                                {value: "tertiary-xl", label: "Tertiary Extra Large"}
                                            ],
                                            defaultValue: "primary-lg"
                                        },
                                        {
                                            type: "textfield",
                                            id: "text",
                                            label: "Button Text",
                                            placeholder: "Button label",
                                            tooltip: "Text that appears on the button"
                                        },
                                        {
                                            type: "select",
                                            id: "color",
                                            label: "Button Color",
                                            tooltip: "Select button color theme",
                                            options: [
                                                {value: "red", label: "Red"},
                                                {value: "emerald", label: "Emerald"},
                                                {value: "purple", label: "Purple"},
                                                {value: "dark-blue", label: "Dark Blue"},
                                                {value: "fountain", label: "Fountain"},
                                                {value: "blue", label: "Blue"},
                                                {value: "violet", label: "Violet"}
                                            ],
                                            defaultValue: "red"
                                        },
                                        {
                                            type: "checkbox",
                                            id: "inverted",
                                            label: "Inverted Style",
                                            tooltip: "Use inverted color scheme"
                                        },
                                        {
                                            type: "select",
                                            id: "target_type",
                                            label: "Link Type",
                                            tooltip: "Choose whether to link to a page or document",
                                            options: [
                                                {value: "path", label: "Page Link"},
                                                {value: "document", label: "Document Download"}
                                            ],
                                            defaultValue: "path"
                                        },
                                        {
                                            type: "pathbrowser",
                                            id: "link",
                                            label: "Link URL",
                                            placeholder: "Enter link URL",
                                            tooltip: "Destination URL for the button"
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            type: "tab",
                            id: "tab_nexus.image_type.label",
                            label: "Image & Background",
                            children: [
                                {
                                    type: "select",
                                    id: "picture_type",
                                    label: "Image Type",
                                    tooltip: "Choose how to display the image",
                                    options: [
                                        {value: "picture", label: "Picture"},
                                        {value: "background", label: "Background"}
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "picture",
                                    label: "Picture Settings",
                                    children: [
                                        {
                                            type: "media",
                                            id: "image",
                                            label: "Image",
                                            tooltip: "Upload an image file",
                                            allowedMimeTypes: [
                                                "image/gif",
                                                "image/jpeg",
                                                "image/png",
                                                "image/tiff",
                                                "image/svg+xml"
                                            ]
                                        },
                                        {
                                            type: "checkbox",
                                            id: "eager_load",
                                            label: "Eager Loading",
                                            tooltip: "Load image immediately for better performance"
                                        },
                                        {
                                            type: "textfield",
                                            id: "caption",
                                            label: "Image Caption",
                                            placeholder: "Enter caption text",
                                            tooltip: "Optional caption text for the image"
                                        },
                                        {
                                            type: "select",
                                            id: "ratio",
                                            label: "Aspect Ratio",
                                            tooltip: "Set the image aspect ratio",
                                            options: [
                                                {value: "auto", label: "Auto"},
                                                {value: "1/1", label: "1:1 (Square)"},
                                                {value: "3/2", label: "3:2"},
                                                {value: "16/9", label: "16:9 (Widescreen)"},
                                                {value: "round", label: "Round"}
                                            ],
                                            defaultValue: "auto"
                                        },
                                        {
                                            type: "checkbox",
                                            id: "zoom",
                                            label: "Enable Zoom on Hover"
                                        }
                                    ]
                                },
                                {
                                    type: "group",
                                    id: "background",
                                    label: "Background Settings",
                                    children: [
                                        {
                                            type: "select",
                                            id: "type",
                                            label: "Background Type",
                                            tooltip: "Choose background style",
                                            options: [
                                                {value: "color", label: "Solid Color"},
                                                {value: "gradient", label: "Gradient"}
                                            ],
                                            defaultValue: "color"
                                        },
                                        {
                                            type: "select",
                                            id: "color",
                                            label: "Background Color",
                                            tooltip: "Select background color",
                                            options: [
                                                {value: "white", label: "White"},
                                                {value: "red", label: "Red"},
                                                {value: "black", label: "Black"},
                                                {value: "dark-gray-1", label: "Dark Gray"},
                                                {value: "gray", label: "Gray"},
                                                {value: "blue", label: "Blue"},
                                                {value: "turquoise", label: "Turquoise"}
                                            ],
                                            defaultValue: "red"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const nexusInitialValues = {
            intro_alignment: "left",
            content_alignment: "center",
            animations: {
                animation: "preset_1"
            },
            container_id: {
                name: "content-section"
            },
            eyebrow: {
                eyebrow: "Welcome to",
                tag: "p",
                type: "SP3",
                color: "blue",
                new_tab: false
            },
            headline: {
                headline: "Your Amazing Content",
                tag: "h1",
                type: "SP0",
                italic: false
            },
            text: {
                text: "<p>This is a rich text example with <strong>bold text</strong> and <em>italic text</em>. You can add links, lists, and other formatting.</p>",
                type: "SP6"
            },
            button: {
                type: "primary-lg",
                text: "Learn More",
                color: "red",
                inverted: false,
                target_type: "path",
                link: "/example-page"
            },
            picture_type: "picture",
            picture: {
                eager_load: true,
                caption: "Sample image caption",
                ratio: "16/9",
                zoom: true
            },
            background: {
                type: "color",
                color: "white"
            }
        };

        setDialogConfigJson(JSON.stringify(nexusContentDialog, null, 2));
        setInitialValuesJson(JSON.stringify(nexusInitialValues, null, 2));
        setParsedDialog(nexusContentDialog);
        setCurrentFormData(nexusInitialValues);
        setParseError(null);
        dialogKey.current += 1;
    };

    const clearInputs = () => {
        setDialogConfigJson(JSON.stringify(DEFAULT_DIALOG_CONFIG, null, 2));
        setInitialValuesJson(JSON.stringify(DEFAULT_INITIAL_VALUES, null, 2));
        setCurrentFormData(DEFAULT_INITIAL_VALUES);
        setParseError(null);
    };

    const handleSaveSuccess = (data: any) => {
        console.log('✅ Save successful! Data:', data);
        // Update the values JSON with saved data
        setInitialValuesJson(JSON.stringify(data, null, 2));
        setCurrentFormData(data);
        alert('Save successful! Check console for saved data.');
    };

    const handleSaveError = (error: string) => {
        console.error('❌ Save failed:', error);
        alert(`Save failed: ${error}`);
    };

    return (
        <View padding="size-300" maxWidth="100%">
            <Heading level={2} marginBottom="size-300">Live JSON Dialog Tester</Heading>

            <Text marginBottom="size-200">
                Test dialogs with real-time value updates. You can modify values while the dialog is open!
            </Text>

            {/* Controls */}
            <Flex direction="row" gap="size-100" marginBottom="size-300" wrap alignItems="center">
                <Button variant="secondary" onPress={loadComplexExample}>
                    Load Complex Example
                </Button>
                <Button variant="secondary" onPress={loadNexusContentExample}>
                    Load Nexus Content Example
                </Button>
                <Button variant="secondary" onPress={clearInputs}>
                    Reset to Simple
                </Button>
                <Button variant="cta" onPress={parseJsonInputs}>
                    <Play/>
                    <Text>Test Dialog</Text>
                </Button>
                {isDialogOpen && (
                    <Button variant="accent" onPress={updateInitialValues}>
                        <Refresh/>
                        <Text>Update Values Live</Text>
                    </Button>
                )}
                <Switch isSelected={showLiveEditor} onChange={setShowLiveEditor}>
                    Show Live Editor
                </Switch>
                {isDialogOpen && (
                    <Switch isSelected={showCurrentValues} onChange={setShowCurrentValues}>
                        Show Current Values
                    </Switch>
                )}
            </Flex>

            {/* Error Display */}
            {parseError && (
                <View
                    backgroundColor="red-400"
                    borderWidth="thin"
                    borderColor="red-400"
                    borderRadius="medium"
                    padding="size-200"
                    marginBottom="size-300"
                >
                    <Heading level={4} UNSAFE_style={{color: 'red', margin: 0, marginBottom: '8px'}}>
                        Error
                    </Heading>
                    <Text UNSAFE_style={{color: 'red'}}>
                        {parseError}
                    </Text>
                </View>
            )}

            {/* Current Values Display */}
            {showCurrentValues && isDialogOpen && (
                <View marginBottom="size-400">
                    <Heading level={3} marginBottom="size-200">Current Form Values (Live)</Heading>
                    <View
                        backgroundColor="gray-50"
                        borderWidth="thin"
                        borderColor="gray-300"
                        borderRadius="medium"
                        padding="size-200"
                    >
                        <Text>
                            <pre style={{fontSize: '12px', whiteSpace: 'pre-wrap', margin: 0}}>
                                {JSON.stringify(currentFormData, null, 2)}
                            </pre>
                        </Text>
                    </View>
                </View>
            )}

            {/* Layout: Dialog + Live Editor */}
            <Flex direction="row" gap="size-300" marginBottom="size-400">
                {/* JSON Input Areas */}
                <View flex={showLiveEditor && isDialogOpen ? "1" : "2"}>
                    <Heading level={3} marginBottom="size-200">Configuration & Values</Heading>

                    <View marginBottom="size-300">
                        <Heading level={4} marginBottom="size-100">Dialog Configuration</Heading>
                        <TextArea
                            label="Dialog JSON"
                            value={dialogConfigJson}
                            onChange={setDialogConfigJson}
                            height="200px"
                            width="100%"
                        />
                    </View>

                    <View>
                        <Heading level={4} marginBottom="size-100">Values JSON</Heading>
                        <TextArea
                            label="Values JSON"
                            value={initialValuesJson}
                            onChange={setInitialValuesJson}
                            height="200px"
                            width="100%"
                        />
                    </View>
                </View>

                {/* Live Dialog Display */}
                {isDialogOpen && showLiveEditor && (
                    <View flex="1" borderWidth="thin" borderColor="gray-300" borderRadius="medium" padding="size-200">
                        <Heading level={4} marginBottom="size-200">Live Dialog Preview</Heading>
                        <EnhancedDialogBody
                            key={dialogKey.current}
                            dialog={parsedDialog}
                            initialValues={currentFormData}
                            onSubmit={handleFormDataChange}
                            onSaveSuccess={handleSaveSuccess}
                            onSaveError={handleSaveError}
                            onCancel={() => {
                                setIsDialogOpen(false);
                                console.log('Dialog cancelled');
                            }}
                        />
                    </View>
                )}
            </Flex>

            {/* Full Screen Dialog */}
            {isDialogOpen && !showLiveEditor && (
                <DialogTrigger isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <ActionButton UNSAFE_style={{display: 'none'}}>Hidden</ActionButton>

                    <Dialog size="L">
                        <Header>
                            <Heading>{parsedDialog.title || 'Test Dialog'}</Heading>
                        </Header>
                        <Divider/>
                        <Content>
                            <EnhancedDialogBody
                                key={dialogKey.current}
                                dialog={parsedDialog}
                                initialValues={currentFormData}
                                onSaveSuccess={handleSaveSuccess}
                                onSaveError={handleSaveError}
                                onCancel={() => setIsDialogOpen(false)}
                            />
                        </Content>
                    </Dialog>
                </DialogTrigger>
            )}

            {/* Instructions */}
            <View marginTop="size-400">
                <Heading level={3} marginBottom="size-200">How to Use</Heading>

                <View backgroundColor="gray-100" padding="size-200" borderRadius="medium">
                    <Text>
                        <strong>1. Configure:</strong> Edit the Dialog JSON and Values JSON above.
                    </Text>
                    <br/>
                    <Text>
                        <strong>2. Test:</strong> Click "Test Dialog" to open the dialog with your configuration.
                    </Text>
                    <br/>
                    <Text>
                        <strong>3. Live Updates:</strong> Toggle "Show Live Editor" to see the dialog inline and edit
                        values in real-time.
                    </Text>
                    <br/>
                    <Text>
                        <strong>4. Update Values:</strong> Modify the Values JSON and click "Update Values Live" to see
                        changes immediately.
                    </Text>
                </View>

                <View marginTop="size-300" backgroundColor="gray-50" padding="size-200" borderRadius="medium">
                    <Heading level={4} marginBottom="size-100">Features</Heading>
                    <Text>
                        • Real-time value updates while dialog is open<br/>
                        • Live preview mode to see dialog inline<br/>
                        • Full-screen dialog mode<br/>
                        • Automatic JSON formatting<br/>
                        • Error handling and validation
                    </Text>
                </View>
            </View>
        </View>
    );
};

const meta: Meta<typeof LiveJsonDialogTester> = {
    title: 'Dialog/LiveJsonTester',
    component: LiveJsonDialogTester,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                story: 'Enhanced interactive dialog tester with real-time value updates. You can modify values while the dialog is open and see changes immediately.',
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveTester: Story = {
    name: 'Live JSON Dialog Tester',
    render: () => <LiveJsonDialogTester/>,
};
