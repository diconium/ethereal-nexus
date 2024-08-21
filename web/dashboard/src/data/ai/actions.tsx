"use server";

import { ReactNode } from "react";
import { getMutableAIState, streamUI, createAI } from "ai/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { CoreMessage, ToolInvocation } from 'ai'
import { BotMessage, PreviewScreen } from "@/app/(session)/components/generate/Chat";

export const sendMessage = async (message: string) => {
    console.log('Response ON ACTIONS', message);
    const history = getMutableAIState<typeof AI>();

    console.log('history get', history.get());

    // Update the AI state with the new user message.
    // history.update([ ...history.get(), { role: "user", content: message }]);

    // TODO: on the system message create a method to iterate over all folder/files under components/ui and build the string like If the users asks for an avatar component, you should import the one that is under /@/components/ui/avatar directory.

    const reply = await streamUI({
        model: openai("gpt-4"),
        messages: [ ...history.get(), { role: "user", content: message }],
        initial: (
            <BotMessage>
                <div>Loading...</div>
            </BotMessage>
        ),
        system: `\
            You are a bot that can generate an index.js file, with information that was provided from the user, and return it as plain text. 
            You should take in consideration that the you should utilize the radix-ui library for its UI components and should also integrate Tailwind CSS for styling.
            The imports from the radix-ui or any other library should be added to the file.
            
            If the users asks for an avatar component, you should import the one that is under /@/components/ui/avatar directory.
            If the users asks for an card component, you should import the one that is under /@/components/ui/card directory.
            
            Only JSX should be returned to the user.
            
            If the user provides the necessary information to build the component, call \`create_component\` with the generated JSX as parameter.
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
            create_component: {
                description: "Displays the generated JSX component to the user.",
                parameters: z.object({
                    generatedComponent: z.string().describe('The JSX code that was generated.'),
                }),
                generate: async function* ({ generatedComponent }) {
                    console.log('Described Component aa', generatedComponent);

                    yield (<BotMessage>Loading bot message...</BotMessage>)

                    // Update the AI state again with the response from the model.
                    console.log('Described componnet', generatedComponent);
                    history.done([...history.get(), { role: "assistant", name: "create_component", content: generatedComponent }]);

                    // <PreviewScreen html_code={generatedComponent} />
                    return (
                        <pre>
                            <code>
                                {generatedComponent}
                            </code>
                        </pre>
                    );
                }
            },
        },
    });

    console.log('Reply', reply);

    return {
        id: Date.now(),
        role: "assistant",
        display: reply.value,
    };
};

export type AIState = Array<{
    id?: number;
    name?: "create_component" | "update_component";
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





