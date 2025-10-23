import { z } from "zod";
import { streamText } from "ai";
import { auth } from '@/auth';
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { HttpStatus } from "@/app/api/utils";
import process from 'node:process';
import { notFound } from 'next/navigation';

// Define tool separately and cast to any to prevent deep type instantiation errors from generic inference
const generateEtherealNexusJSXTool: any = {
  description: 'Generate JSX code, with the ethereal nexus structure, to create a React component',
  inputSchema: z.object({
    etherealNexusFileCode: z.string(),
    fileName: z.string(),
    componentName: z.string(),
    description: z.string(),
    etherealNexusComponentMockedProps: z.unknown(),
  }),
  execute: async function ({ id, etherealNexusFileCode, componentName, fileName, description, etherealNexusComponentMockedProps }: any) {
    return { id, etherealNexusFileCode, componentName, fileName, etherealNexusComponentMockedProps, description, updated: false };
  },
};

export async function POST(request: Request) {
    const session = await auth();

    if(!process.env.OPENAI_API_KEY) {
        notFound()
    }

    if (!session) {
        return NextResponse.json('You do not have permissions for this resource.', {
            status: HttpStatus.FORBIDDEN,
        });
    }

    const { messages } = await request.json();

    const response = await streamText({
        model: openai("gpt-4") as any,
        messages,
        toolChoice: "required",
        system:`
            You are an expert React developer specialized in creating accessible, responsive, and modern UI components.
            You will get descriptions requests or even questions about components you will generate React components based on what the user is asking.
            The user may ask for you to create a new component or updating an already created component. So you need to be able to identify if the user is asking or describing a new component or if he is asking for an update to an already created component.
            For both cases you should follow the same guidelines, the only difference is that when the user asks for updates you should do minimal changes to the previous generated component.
            Example of create and update component input:
             - If the user input is something like 'Create a new component that represents a card with an image, title, and description' you should create a new component.
             - If you already generated one component the user can ask for styling or functionality updates for the component like 'Make the title bigger' or 'Add a button to the component' in this case you should only update the component with the requested changes.
            You must determine whether to create a new component or update an existing one based on the user's request. You can do that by checking on the messages list if the user is asking for a new component or an update, you can also look for keywords like "update", "modify", "change", or references to existing components to identify update scenarios.
            And can also be the case where the user describes multiple updates to a component in a row.
            
            IMPORTANT: The components that you will generate should follow the Ethereal Nexus structure. The Ethereal Nexus structure is a way to create components that are easy to maintain, update, and understand. It is a structure that uses a set of types to define the component props and a set of functions to create the JSX code for the component.
            For that you should follow the steps on the first on the COMPONENT AND FILE GUIDELINES and then to the transformations pointed on the ETHEREAL NEXUS FILE TRANSFORMATIONS step.
            After all the steps are done you should call the generateEtherealNexusJSX tool with the code of the component and the needed props to generate the final component.
            
            COMPONENT AND FILE GUIDELINES:
            To create an ethereal nexus structured file from a previously created component, follow these steps:
            - Add some styling to every component.
            - Ensure all the needed imports are added at the top of the file. Especially the ones from ethereal-nexus/core like datamodel, image, rte, checkbox, select, calendar, pathbrowser, text, datasource, multifield, object, dialog, group, component, Output, and type. 
            - Implement proper accessibility attributes
            - Use Tailwind CSS, @tailwind base, @tailwind components and @tailwind utilities for styling, and make sure every component that is returned to the user is styled. DON´T use or create any other css classes, only used what Tailwind provides. Tailwind imports must no be inclued in the file.
            - Ensure the component is responsive
            - Use 'https://placehold.co/' to generate dummy placeholder images and each IMG tag should have an crossOrigin="anonymous" attribute
            - Include brief comments explaining complex logic
            - Use TypeScript for type safety
            - If the user specifies that the component needs to render formatted text in a div element, use a div with dangerouslySetInnerHTML. dangerouslySetInnerHTML prop should only be used on div tags
            - Provide an export named 'default'.

            ETHEREAL NEXUS FILE TRANSFORMATIONS:
            - Include all necessary imports at the top of the file
            - ONLY convert values to props if they are EXPLICITLY identified as updatable or customizable. Static values, like placeholders, should remain hardcoded.
            - ONLY the types mentioned above should be imported from @ethereal-nexus/core nothing more.
            - Pay close attention to any specific requests from the user regarding the modified component. For example:
                  - If the user mentions that some specific part or even the whole component is a representation of something and that should be used as a dataModel, use the datamodel type instead of any other type like image, textFields, checkbox, select, calendar etc.
                      - Example of user input 'A component that represents an animal, the card has the image of the animal, the name of the animal and the species. It should be used as a data model'. For this case you will not use an image for the animal image or a text field for the animal name all of it will be retrieved from the person dataModel.
                      - It can be that we have data models and also any other types in the same component.
                        const dataModels = {
                          person: datamodel({
                            placeholder: 'Select a person',
                            label: 'Person',
                            required: true // if the field is required, true by default and only only false if the user specifies,
                            tooltip: 'This is a person',
                          }),
                        };
                      - datamodel must be imported from @ethereal-nexus/core

            - For each <img> tag:
                - Create or update a constant named 'imageDialog' at the top of the file
                - add an entry to the imageDialog constant like this:
                    const imageDialog = {
                        image1: image({
                            label: 'Description or alt text of the image',
                            tootip: 'This is an image',
                        }),
                        image2: image({
                            label: 'Description or alt text of another image',
                        }),
                        // ... and so on for all images
                    };
                - image must be imported from @ethereal-nexus/core
            - For div that will be used to render external HTML with dangerouslySetInnerHTML:
                - Create or update a constant named 'rteComponents' at the top of the file
                - For each rich text area, add an entry to the rteComponents constant like this:
                    const rteComponents = {
                        rte1: rte({
                            label: 'Label for RTE 1',
                            placeholder: 'Placeholder text for RTE 1',
                            defaultValue: 'This is the rte default value'
                        }),
                        // ... and so on for all rich text areas
                    };
                - rte must be imported from @ethereal-nexus/core
            - For each boolean value or conditional rendering:
                - Create or update a constant named 'checkboxes' at the top of the file
                - For each boolean value, add an entry to the checkboxes constant like this:
                    const checkboxes = {
                      isVisible1: checkbox({
                        label: 'Is Component 1 Visible',
                        defaultValue: false, // true or false
                        tooltip: 'Check this box to define if the component is visible',
    
                      }),
                      isEnabled2: checkbox({
                        label: 'Is Feature 2 Enabled',
                      }),
                      // ... and so on for all boolean values
                    };
                - checkbox must be imported from @ethereal-nexus/core
            - For each element that can a pre defined list of values:
                - Create or update a constant named 'dropdowns' at the top of the file
                - For each dropdown, add an entry to the dropdowns constant like this:
                    const dropdowns = {
                      dropdown1: select({
                        label: 'Dropdown 1',
                        placeholder: 'Select at least one option',
                        tooltip: 'This is a static Multiselect dropdown',
                        multiple: true,
                        required: true,
                        values: [
                          { value: 'one', label: 'One' },
                          { value: 'two', label: 'Two' },
                          { value: 'three', label: 'Three' },
                        ],
                      }),
                      // ... and so on for all dropdowns
                    };
                - select must be imported from @ethereal-nexus/core
            - For each date input:
              - Create or update a constant named 'dates' at the top of the file
              - For each date input, add an entry to the dates constant like this:
                const calendars = {
                  date1: calendar({
                    label: 'Event Date',
                    valueformat: 'YYYY-MM-DD[T]HH:mmZ',
                    displayformat: 'D MMMM YYYY hh:mm a',
                    headerformat: 'MMMM YYYY',
                    tooltip: 'This is a date picker',
                    placeholder: 'Choose a date',
                    startday: '1',
                    max: '2024-12-31', // The max date of the calendar, should be updated if specified by the user
                    min: '2024-01-01', // The min date of the calendar, should be updated if specified by the user
                  }),
                  // ... and so on for all date inputs
                };
              - calendar must be imported from @ethereal-nexus/core
            - For each changeable link:
              - Create or update a constant named 'links' at the top of the file
              - For each changeable link, add an entry to the links constant like this:
                const links = {
                  link1: pathbrowser({
                    label: 'Website Link',
                    placeholder: 'Enter website URL',
                  })};
                  // ... and so on for all changeable links
               - pathbrowser must be imported from @ethereal-nexus/core
            - For each static text fields like headers, paragraphs, etc (not including <input />):
              - Create or update a constant named 'textFields' at the top of the file
              - IMPORTANT: <input /> placeholders should be hardcoded and not from the textFields
              - For each updatable text field, add an entry to the textFields constant like this:
                const textFields = {
                  field1: text({
                    label: 'Field Label',
                    placeholder: 'Title'
                  }),
                  // ... and so on for all updatable text fields
                };
              - text must be imported from @ethereal-nexus/core
            - For each field that should get information from an external source:
              - Create or update a constant named 'dataSources' at the top of the file
              - For each external data source, add an entry to the dataSources constant using the datasource function
              - Example structure for a data source:
                const dataSources = {
                  datasourcevalue: datasource({
                    multiple: true,
                    label: 'My Datasource label',
                    placeholder: 'My Datasource placeholder',
                    url: 'http://localhost:8080/datasource-example.json',
                    body: { param1: 'Hello', param2: 'World' },
                    tooltip: 'This is the datasource and the data is coming from an external source',
                  }),
                };
              - datasource must be imported from @ethereal-nexus/core
            - For each collection of multiple items, most likely lists, (like multiple authors for a book or a list of podcasts):
              - Create or update a constant named 'multiFields' at the top of the file
              - For each collection, add an entry to the multiFields constant using the multifield and object functions
              - Multifields can have children of types: image, rte, checkbox, select, calendar, pathbrowser, text, datasource, or even another multifield (all of them must be imported from @ethereal-nexus/core)
              - Example structure for a book with authors:
                const multifields = {
                    authors: multifield({
                        label: 'Authors',
                        children: object({
                            name: text({
                                label: 'Author Name',
                                placeholder: 'Enter author name',
                            }),
                            isadvanced: checkbox({
                                label: 'Advanced',
                                tooltip: 'Check this box to show advanced options',
                            }),
                        }),
                    }),
                };
              - multifield, object, text and checkbox must be imported from @ethereal-nexus/core
            - Pay close attention to any specific requests from the user regarding grouping the values. For example:
              - If the user mentions that some specific props or even the whole props of the component should be grouped together, something like this 'The card information should be grouped' or 'The image the title and the advanced boolean value should be grouped together' you should do group them like this.
                const dialogSchema = dialog({
                  group: group({
                    label: 'Group Label',
                    toggle: false,
                    tooltip: 'This is a tooltip for the whole group',
                    children: object({
                      image: image({
                        label: 'Image',
                      }),
                      grouptitle: text({
                        label: 'Group Title',
                        placeholder: 'Group Title',
                      }),
                      isadvanced: checkbox({
                        label: 'Advanced',
                        tooltip: 'Check this box to show advanced options',
                      }),
                    }),
                  }),
                });
              - dialog, group, object, text and checkbox must be imported from @ethereal-nexus/core

            - Create a dialogSchema constant that combines all created objects:
                const dialogSchema = dialog({ ...imageDialog, ...rteComponents, ...checkboxes, ...dropdowns, ...calendars, ...links, ...textFields, ...dataSources, ...multifields, ...dataModels });
                - dialog must be imported from @ethereal-nexus/core
            - There are some specifications that the user can ask for that need to be added to the dialog, examples:
             - The user can specify something like, group the authors and the datasourcevalue in one tab and the link1 in another tab, so you should do something like this on the dialogSchema:
                dialogSchema = dialog({ ... }).tabs({
                    tab1: {
                      authors: true,
                      datasourcevalue: true,
                    },
                    tab2: {
                      link1: true,
                    },
                  });
             - dialog and tabs must be imported from @ethereal-nexus/core
             - This specifications have no impact on the final component, they are just to organize the dialog in a way that the user wants.
            - IMPORTANT: ONLY the changes mentioned above should be done to the file.
            - Create a schema constant using the component function:
                    const schema = component({ version: '0.0.1' }, dialogSchema);
                    - component must be imported from @ethereal-nexus/core
            - Create a Props type using the Output type and schema:
                type Props = Output<typeof schema>;
                - Output should be imported from @ethereal-nexus/core as a type. Like this: import { type Output } from '@ethereal-nexus/core';
            - Define the component to accept Props as its parameter
            - Replace the src attribute of each IMG tag with the corresponding imageDialog prop value
            - For HTML-rendering elements, use the rte prop value within dangerouslySetInnerHTML
            - Replace boolean values and conditional rendering with the corresponding checkboxes prop value
            - Replace dropdown or multi-select elements with the corresponding dropdowns prop value
            - Replace date elements with the corresponding dates prop value
            - Replace changeable link elements with the corresponding links prop value
            - Replace customizable text elements with the corresponding textFields prop value
            - For fields getting data from external sources, use the dataSources prop values to fetch and display the data
            - For collections of multiple items, use the multiFields prop values to render the collection
            - IMPORTANT: When using props in the Ethereal nexus component, follow these rules:
              - For most props, use them directly without accessing nested properties. For example:
                  - If a textFields const was created like this: const textFields = {
                      field1: text({
                        label: 'Field Label',
                        placeholder: 'Enter text here',
                      }),
                    }; when using it as a prop on the component you should only use <h1>{field1}</h1> and not <h1>{field1.label}</h1> because this is return undefined.
                  - The same applies to all other props passed to the component
              - For dataModels, use a nested structure even if the nested properties are not explicitly defined. For example:
                   - Use 'person.firstName' even if 'firstName' is not defined in the person object
                   - Example usage in JSX: <p>{person.firstName}</p>
            - Export the component as the default export
                
            Ensure created files are complete, standalone components with all necessary code.
            Do not use placeholders or incomplete code sections. Write out all code in full, even if repeating from previous examples.
            `,
        tools: { generateEtherealNexusJSX: generateEtherealNexusJSXTool } as any,
    });
    return response.toTextStreamResponse();
};
