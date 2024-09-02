"use client";

import React from "react";
import type { AI } from "@/data/ai/actions";
import { Button } from "@/components/ui/button";
import "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useForm } from "@/data/ai/use-form";
import { ChatInputs } from "@/data/ai/chat-schema";
import { useEnterSubmit } from "@/data/ai/use-enter-submit";
import { useActions, useUIState } from "ai/rsc";
import type { SubmitHandler } from "react-hook-form";

export function NewProjectModalPage() {
    const [messages, setMessages] = useUIState<typeof AI>([]);

    const { sendMessage } = useActions<typeof AI>();
    const { formRef, onKeyDown } = useEnterSubmit();

    const form = useForm<ChatInputs>();

    const onSubmitPrompt: SubmitHandler<ChatInputs> = async (data) => {
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
        } catch (error) {
            console.error('Error', error);
        }
    };

    return (
      <main className="h-full">
          <div className="w-full h-full">
              <div className="flex flex-col bg-white text-foreground h-full">
                  <div className="top-0 border-b px-4 py-3">
                      <div className="flex items-center justify-between">
                          <div className="font-medium text-center w-full">Describe the component that you want to create</div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                      <div className="space-y-4 p-4 h-full">
                          {messages.map((message, index) => {
                                  return (
                                      <React.Fragment key={index}>
                                          {message?.display}
                                      </React.Fragment>
                                  )
                          })}
                      </div>
                  </div>
                  <div className="bottom-0 border-t px-4 py-3">
                      <div className="relative flex">
                          <form ref={formRef} onSubmit={form.handleSubmit(onSubmitPrompt)} className="mr-2 flex-1">
                              <Input placeholder="Describe the UI that you want to generate..." className="bg-white dark:bg-transparent font-bold" {...form.register('message')}/>
                          </form>
                          <Button type="submit" variant="primary" size="base" disabled={form.watch('message') === ''} onClick={form.handleSubmit(onSubmitPrompt)}>Submit</Button>
                      </div>
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
    console.log('HTML CODE', html_code);
    return (
        <div className="w-full h-full bg-white rounded-lg  shadow-lg p-2 border" style={{ border: "1px solid red" }}>
            <div dangerouslySetInnerHTML={{ __html: html_code }} />
        </div>
    );
};
