"use server";

import { ReactNode } from "react";
import { getMutableAIState, streamUI, createAI } from "ai/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ToolInvocation } from 'ai'
import { BotMessage } from "@/components/components/create/botMessageCard";
import GeneratedUISwitch from "@/components/components/create/generatedUISwitch";
import GeneratedCodeDisplay from "@/components/components/create/generatedCodeDisplay";
import {ComponentCard} from "@/components/components/create/ComponentCard";

export const sendMessage = async (message: string) => {
    const history = getMutableAIState<typeof AI>();

    // Update the AI state with the new user message.
    // history.update([ ...history.get(), { role: "user", content: message }]);

    const reply = await streamUI({
        model: openai("gpt-4"),
        messages: [ ...history.get(), { role: "user", content: message }],
        initial: (
            <BotMessage>
                <div>Loading...</div>
            </BotMessage>
        ),
        system:` 
            You are an expert React developer specializing in creating accessible, responsive, and modern UI components. 
            You will generate React components based on user requests. There are two types of requests you should handle:

            1. Original Component Creation:
            When the user asks for a new component or UI creation, follow these steps:
            - Create a simple function without any parameters that returns a component, like function ComponentName() {...}
            - Use hardcoded values for any data or props
            - Implement proper accessibility attributes
            - Use Tailwind CSS for styling
            - Ensure the component is responsive
            - Include brief comments explaining complex logic
            - Use TypeScript for type safety
            - For sections that render HTML content, use a div with dangerouslySetInnerHTML
            - Do NOT include any imports or exports - just the component function itself
            - IMPORTANT: Once you have completed writing the original component, IMMEDIATELY call the 'generateJSX' action with the component name the JSX code and the file name.

            2. Modified Component Creation:
            When the user asks to create a modified file from a previously created component, follow these steps:
            - Start with the original component
            - Include all necessary imports at the top of the file
            - ONLY convert values to props if they are EXPLICITLY identified as updatable or customizable. Static values should remain hardcoded.
            - Import the following from @ethereal-nexus/core: image, rte, dialog, component, checkbox, select, calendar, pathbrowser, text, datasource, mutifield and object. Output should be imported as type.
            
            - For each <img> tag in the original component:
                - Create or update a constant named 'imageDialog' at the top of the file
                - add an entry to the imageDialog constant like this:
                const imageDialog = {
                    image1: image({
                        label: 'Description or alt text of the image',
                    }),
                    image2: image({
                        label: 'Description or alt text of another image',
                    }),
                    // ... and so on for all images
                };
            - For each div with dangerouslySetInnerHTML in the original component:
                - Create or update a constant named 'rteComponents' at the top of the file
                - For each rich text area, add an entry to the rteComponents constant like this:
                const rteComponents = {
                    rte1: rte({
                        label: 'Label for RTE 1',
                        placeholder: 'Placeholder text for RTE 1'
                    }),
                    // ... and so on for all rich text areas
                };
            - For each boolean value or conditional rendering in the original component:
                - Create or update a constant named 'checkboxes' at the top of the file
                - For each boolean value, add an entry to the checkboxes constant like this:
                const checkboxes = {
                  isVisible1: checkbox({
                    label: 'Is Component 1 Visible',
                  }),
                  isEnabled2: checkbox({
                    label: 'Is Feature 2 Enabled',
                  }),
                  // ... and so on for all boolean values
                };
            - For each element that can a pre defined list of values in the original component:
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
            - For each date input in the original component:
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
                    max: '2024-12-31',
                    min: '2024-01-01',
                  }),
                  // ... and so on for all date inputs
                };
            - For each changeable link in the original component:
              - Create or update a constant named 'links' at the top of the file
              - For each changeable link, add an entry to the links constant like this:
                const links = {
                  link1: pathbrowser({
                    label: 'Website Link',
                    placeholder: 'Enter website URL',
                  })};
                  // ... and so on for all changeable links
            - For each updatable text field in the original component:
              - Create or update a constant named 'textFields' at the top of the file
              - For each updatable text field, add an entry to the textFields constant like this:
                const textFields = {
                  field1: text({
                    label: 'Field Label',
                    placeholder: 'Enter text here',
                  }),
                  // ... and so on for all updatable text fields
                };
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
            - For each collection of multiple items, most likely lists, (like multiple authors for a book) in the original component:
              - Create or update a constant named 'multiFields' at the top of the file
              - For each collection, add an entry to the multiFields constant using the multifield and object functions
              - Multifields can have children of types: image, rte, checkbox, select, calendar, pathbrowser, text, datasource, or even another multifield
              - Example structure for a book with authors:
                const multifields = {s
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
            - Create a dialogSchema constant that combines all created objects:
                const dialogSchema = dialog({ ...imageDialog, ...rteComponents, ...checkboxes, ...dropdowns, ...calendars, ...links, ...textFields, ...dataSources, ...multifields });
            - Create a schema constant using the component function:
            const schema = component({ version: '0.0.1' }, dialogSchema, {});
            - Create a Props type using the Output type and schema:
                type Props = Output<typeof schema>;
            - Define the component to accept Props as its parameter
            - Replace hardcoded values with prop values
            - Replace the src attribute of each <img> tag with the corresponding imageDialog prop value
            - For HTML-rendering elements, use the rte prop value within dangerouslySetInnerHTML
            - Replace boolean values and conditional rendering with the corresponding checkboxes prop value
            - Replace dropdown or multi-select elements with the corresponding dropdowns prop value
            - Replace date elements with the corresponding dates prop value
            - Replace changeable link elements with the corresponding links prop value
            - Replace customizable text elements with the corresponding textFields prop value
            - For fields getting data from external sources, use the dataSources prop values to fetch and display the data
            - For collections of multiple items, use the multiFields prop values to render the collection
            - Export the component as the default export
            - IMPORTANT: Once you have completed writing the modified component, IMMEDIATELY call the 'generateEtherealNexusJSX' action with the component name and JSX code.
    
            Ensure both files are complete, standalone components with all necessary code.
            Do not use placeholders or incomplete code sections. Write out all code in full, even if repeating from previous examples.
            
            IMPORTANT: Only call 'generateJSX' when creating a new component, and only call 'generateEtherealNexusJSX' when modifying an existing component. Never call both actions for the same request.
            `,
        text: ({ content, done }) => { // If the model doesn't have a relevant tool to use
            console.log("Content from text", content);
            if (done) {
                // Update the AI state again with the response from the model.
                history.done((messages) => [
                    ...messages,
                    { role: 'assistant', content },
                ]);
            }
            return <BotMessage>{content}</BotMessage>
        },
        tools: { // Record<string, tool>
            generateJSX: {
                description: 'Generate JSX code for React components',
                parameters: z.object({
                    originalComponentName: z.string().describe('The name of the original React component'),
                    fileName: z.string().describe('The name of the file where the component will be saved'),
                    originalJSX: z.string().describe('The JSX code for the original component'),
                }),
                generate: async function* ({ originalJSX, originalComponentName, fileName }) {
                    yield (<BotMessage>Loading bot message...</BotMessage>);

                    // Update the AI state again with the response from the model.
                    history.done([
                        ...history.get(),
                        {
                            role: 'assistant',
                            name: 'generateJSX',
                            content: originalJSX,
                        },
                    ]);

                    return (
                        <ComponentCard generatedCode={originalJSX} componentName={originalComponentName} fileName={fileName} />
                    );
                }
            },
            generateEtherealNexusJSX: {
                description: 'Generate JSX code for the modified React component',
                parameters: z.object({
                    componentName: z.string().describe('The name of the modified React component'),
                    jsx: z.string().describe('The JSX code for the modified component')
                }),
                generate: async function* ({ componentName, jsx }) {
                    yield <div>Generating {componentName}...</div>

                    history.done([
                        ...history.get(),
                        {
                            role: 'assistant',
                            name: 'generateEtherealNexusJSX',
                            content: jsx,
                        },
                    ]);
                    return (
                        <GeneratedCodeDisplay generatedCode={jsx} />
                    )
                }
            },
            update_ui: {
                description: "Update the last UI that was generated with the requested changes.",
                parameters: z.object({
                    newGeneratedUI: z.string().describe('The new HTML code that was generated with the hardcoded values for properties.'),
                    newGeneratedFile: z.string().describe('The new full code of the JSX file that was created.'),
                }),
                generate: async function* ({ newGeneratedUI, newGeneratedFile }) {
                    yield (<BotMessage>Updating ui...</BotMessage>);
                    console.log("new generatedFile", newGeneratedFile);

                    // Update the AI state again with the response from the model.
                    history.done([
                        ...history.get(),
                        {
                            role: 'assistant',
                            name: 'update_ui',
                            content: newGeneratedUI,
                        },
                    ]);

                    return (
                        <GeneratedUISwitch generatedCode={newGeneratedUI} identifier={Date.now()} generatedFile={newGeneratedFile} />
                    );
                }
            },
        },
    });

    return {
        id: Date.now(),
        role: "assistant",
        display: reply.value,
    };
};

export type AIState = Array<{
    id?: number;
    name?: "generateJSX" | "update_ui" | "generateEtherealNexusJSX";
    role: "assistant" | "user" | "system";
    content: string | ReactNode;
}>;

export type UIState = Array<{
    id: number;
    role: "assistant" | "user"
    display: ReactNode; // the react component that we are going to display to the user
    toolInvocations?: ToolInvocation[]; // history of the tool invocations
}>;

export const AI = createAI({
    initialAIState: [] as AIState,
    initialUIState: [] as UIState,
    actions: { sendMessage },
});





