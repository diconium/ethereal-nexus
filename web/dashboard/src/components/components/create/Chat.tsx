"use client";

import React, { useState, useContext }  from 'react';
import { X } from 'lucide-react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { AI } from "@/components/components/create/utils/actions";
import { useActions, useUIState } from "ai/rsc";
import { SubmitHandler } from "react-hook-form";
import { ChatInputs } from "@/components/components/create/utils/chat-schema";
import { UserMessage } from "@/components/components/create/userMessageCard";
import { Input } from "@/components/ui/input";
import { useEnterSubmit } from "@/components/components/create/utils/use-enter-submit";
import { useForm } from "@/components/components/create/utils/use-form";
import { generateId } from "ai";
import { MessageContext } from "@/components/components/create/utils/messageContext";
import { ComponentPreview } from "@/components/components/create/ComponentPreview";

// Main component
export default function Chat() {
    const { currentMessage, setCurrentMessage } = useContext(MessageContext);
    const [messages, setMessages] = useUIState<typeof AI>([]);

    const [showPreview, setShowPreview] = useState(true);
    const { sendMessage } = useActions<typeof AI>();

    const { formRef, onKeyDown } = useEnterSubmit();

    const form = useForm<ChatInputs>();

    const handleSendMessage: SubmitHandler<ChatInputs> = async (data) => {
        const value = data.message.trim();
        formRef.current?.reset();

        if (!value) return;

        setMessages(currentMessages => [
            ...currentMessages,
            {
                id: generateId(),
                role: "user",
                display: <UserMessage>{value}</UserMessage>,
            },
        ]);

        try {
            const responseMessage = await sendMessage(value);
            setMessages(currentMessages => [...currentMessages, responseMessage]);
        } catch (error) {
        }
    };

    return (
        <div className="flex h-full bg-gray-100">
            {/* Chat section */}
            <div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full'} transition-all duration-300 ease-in-out`}>
                <div className="flex-1 p-4 overflow-auto">
                    <ScrollArea.Root className="h-full">
                        <ScrollArea.Viewport className="w-full h-full">
                            {messages.map((message, index) => {
                                return (
                                    <React.Fragment key={index}>
                                        {message?.display}
                                    </React.Fragment>
                                )
                            })}
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar
                            className="flex select-none touch-none p-0.5 bg-gray-200 transition-colors duration-[160ms] ease-out hover:bg-gray-300 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                            orientation="vertical"
                        >
                            <ScrollArea.Thumb className="flex-1 bg-gray-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                        </ScrollArea.Scrollbar>
                    </ScrollArea.Root>
                </div>
                <div className="p-4 bg-white border-t">
                    <form ref={formRef} onSubmit={form.handleSubmit(handleSendMessage)} className="flex gap-2">
                        <Input placeholder="Describe the UI that you want to generate..." className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={onKeyDown} {...form.register('message')}/>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>

            {/* Preview section */}
            {showPreview && (
                <div className="w-1/2 border-l relative">
                    <button
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() => setShowPreview(false)}
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <ComponentPreview />
                </div>
            )}

            {/* Button to show preview when it's hidden */}
            {!showPreview && (
                <button
                    className="fixed bottom-4 right-4 px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    onClick={() => setShowPreview(true)}
                >
                    Show Preview
                </button>
            )}
        </div>
    )
}
