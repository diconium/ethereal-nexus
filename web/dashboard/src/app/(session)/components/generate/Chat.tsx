"use client";

import React from "react";
import type { UIState, AI } from "@/data/ai/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "@/data/ai/use-form";
import { ChatInputs } from "@/data/ai/chat-schema";
import { useEnterSubmit } from "@/data/ai/use-enter-submit";
import { useActions, useUIState } from "ai/rsc";
import type { SubmitHandler } from "react-hook-form";

function ChatList({ messages } : UIState) {
    return (
        <div className="relative mx-auto max-w-2xl px-4">
            {messages.map((message, index) => {
                return (
                    <div key={index} className="pb-4">
                        <div>{message?.display}</div>
                    </div>
                )
            })
        }</div>
    )
};

export function NewProjectModalPage() {
    const [messages, setMessages] = useUIState<typeof AI>([]);
    const { sendMessage } = useActions<typeof AI>();
    const { formRef, onKeyDown } = useEnterSubmit();

    const form = useForm<ChatInputs>();

    const onSubmitPrompt: SubmitHandler<ChatInputs> = async (data) => {
        console.log('Data 11', data);
        const value = data.message.trim();
        formRef.current?.reset();

        if (!value) return;

        setMessages(currentMessages => [
            ...currentMessages,
            {
                id: Date.now(),
                role: "user",
                display: <UserMessage>{value}</UserMessage>,
            },
        ]);

        try {
            const responseMessage = await sendMessage(value);
            setMessages(currentMessages => [...currentMessages, responseMessage]);
            console.log('Response', responseMessage);
        } catch (error) {
            console.error('Error', error);
        }
    }

    return (
            <main>
                <ChatList messages={messages} />
                <div className="fixed inset-x-0 bottom-0 w-full from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
                    <div className="mx-auto sm:max-w-2xl sm:px-4">
                        <div className="px-4 flex justify-center flex-col py-2 space-y-4 border-t shadow-lg bg-background sm:rounded-t-xl sm:border md:py-4 bg-white">
                            <form ref={formRef} onSubmit={form.handleSubmit(onSubmitPrompt)}>
                                <Input placeholder="Name" className="bg-white dark:bg-transparent font-bold" {...form.register('message')}/>
                            </form>
                            <Button type="submit" variant="primary" size="base" disabled={form.watch('message') === ''}>submit</Button>
                        </div>
                    </div>
                </div>
            </main>
    );
};


export function UserMessage({ children } : { children: ReactNode }) {
    return (
        <div className="border border-gray-300 rounded-lg p-4 flex items-start gap-4 text-sm">
            <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <div className="font-semibold">USER</div>
                </div>
                <div className="prose text-muted-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function BotMessage({ children } : { children: ReactNode }) {
    return (
        <div className="border border-gray-300 rounded-lg p-4 flex items-start gap-4 text-sm">
            <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <div className="font-semibold">ASSISTANT</div>
                </div>
                <div className="prose text-muted-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

export const PreviewScreen = ({ html_code }: { html_code: string }) => {
    return (
        <div className="w-full h-full bg-white rounded-lg  shadow-lg p-2 border" style={{ border: "1px solid red" }}>
            <div dangerouslySetInnerHTML={{ __html: html_code }} />
        </div>
    );
};
