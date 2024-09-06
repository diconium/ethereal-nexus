"use client";

import React from "react";
import type { AI } from "@/components/components/create/utils/actions";
import { Button } from "@/components/ui/button";
import "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useForm } from "@/components/components/create/utils/use-form";
import { ChatInputs } from "@/components/components/create/utils/chat-schema";
import { useEnterSubmit } from "@/components/components/create/utils/use-enter-submit";
import { useActions, useUIState } from "ai/rsc";
import type { SubmitHandler } from "react-hook-form";
import { UserMessage } from "./userMessageCard";

export function NewComponent() {
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
                  <div className="flex-1 overflow-auto mb-4">
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
                              <Input placeholder="Describe the UI that you want to generate..." className="bg-white dark:bg-transparent font-bold" onKeyDown={onKeyDown} {...form.register('message')}/>
                          </form>
                          <Button type="submit" variant="primary" size="base" disabled={form.watch('message') === ''} onClick={form.handleSubmit(onSubmitPrompt)}>Submit</Button>
                      </div>
                  </div>
              </div>
          </div>
      </main>
    );
};
