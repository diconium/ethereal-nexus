"use client";

import React, { useContext }  from 'react';
import { X } from 'lucide-react';
import { useChat } from "ai/react";
import { ComponentDetailsContainer } from "@/components/components/create/ComponentDetailsContainer";
import { ChatContext } from "@/components/components/create/utils/chatContext";
import { ChatMessagesDisplayer } from "@/components/components/create/ChatMessagesDisplayer";

const CHAT_ID = "ethereal-nexus-component-generation-chat";

export default function Chat() {
    const { messages, input, setInput, handleSubmit } = useChat({
        id: CHAT_ID,
    });

    const { isComponentDetailsContainerOpen, setIsComponentDetailsContainerOpen } = useContext(ChatContext);

    return (
        <div className="flex h-full bg-gray-100">
            {/* Chat section */}
            <div className={`flex flex-col ${isComponentDetailsContainerOpen ? 'w-1/2' : 'w-full'} transition-all duration-300 ease-in-out`}>
                <ChatMessagesDisplayer messages={messages} chatId={CHAT_ID} />
                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={input}
                            placeholder="Describe the UI that you want to generate..."
                            onChange={event => {
                                setInput(event.target.value);
                            }}
                        />
                        <button type="submit" className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Send</button>
                    </form>
                </div>
            </div>

            {/* Preview section */}
            {isComponentDetailsContainerOpen && (
                <div className="w-1/2 border-l relative">
                    <button
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() => setIsComponentDetailsContainerOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <ComponentDetailsContainer />
                </div>
            )}
        </div>
    )
}
