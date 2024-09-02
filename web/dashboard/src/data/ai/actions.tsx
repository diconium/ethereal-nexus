"use server";

import { ReactNode } from "react";
import { getMutableAIState, streamUI, createAI } from "ai/rsc";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ToolInvocation } from 'ai'
import { BotMessage } from "@/app/(session)/components/generate/Chat";
import GeneratedUISwitch from "@/app/(session)/components/generate/GeneratedUISwitch";

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
        system: `\
            You are a bot that, accordingly with the UI that is described by the user, creates and returns a piece of HTML code styled with Tailwind CSS that can be used to create that UI.
            
            For the case of the <img> tag the src attribute should be "http://placehold.it/widthxheight"
                        
            Only HTML should be returned to the user, you should not give any indication of description of the generated UI.
            
            If the user describes a UI that can be created with HTML call \`create_ui\`.
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
            create_ui: {
                description: "Creates an UI with HTML based on the user's description.",
                parameters: z.object({
                    generatedUI: z.string().describe('The HTML code that was generated.'),
                }),
                generate: async function* ({ generatedUI }) {
                    console.log('Described Component aa', generatedUI);

                    yield (<BotMessage>Loading bot message...</BotMessage>)

                    // Update the AI state again with the response from the model.
                    history.done([
                        ...history.get(),
                        {
                            role: 'assistant',
                            name: 'create_ui',
                            content: generatedUI,
                        },
                    ]);

                    return (
                        <GeneratedUISwitch generatedCode={generatedUI} />
                    );
                }
            },
        },
    });

    return {
        id: Date.now(),
        role: "assistant",
        hasGeneratedUi: history.get().slice(-1).name === 'create_ui',
        display: reply.value,
    };
};

export type AIState = Array<{
    id?: number;
    name?: "create_ui" | "update_component";
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





