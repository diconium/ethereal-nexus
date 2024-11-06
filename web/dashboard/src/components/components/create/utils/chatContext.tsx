"use client";

import React, { createContext, useState } from 'react';

export interface GeneratedComponentMessage {
    componentName: string;
    fileName: string;
    generatedCode: string;
    type: "generateJSX" | "generateEtherealNexusJSX";
};

interface ChatContextType {
    currentMessage?: GeneratedComponentMessage;
    setCurrentMessage: (message: GeneratedComponentMessage) => void;
    isComponentDetailsContainerOpen: boolean;
    setIsComponentDetailsContainerOpen: (isOpen: boolean) => void;
};

export const ChatContext = createContext<ChatContextType>({
    currentMessage: undefined,
    setCurrentMessage: (message?: GeneratedComponentMessage) => message,
    isComponentDetailsContainerOpen: false,
    setIsComponentDetailsContainerOpen: (isOpen: boolean) => isOpen,
});

export const ChatProvider = ({ children }) => {
    const [currentMessage, setCurrentMessage] = useState<GeneratedComponentMessage | undefined>();
    const [isComponentDetailsContainerOpen, setIsComponentDetailsContainerOpen] = useState(false);

    return (
        <ChatContext.Provider value={{ currentMessage, setCurrentMessage, isComponentDetailsContainerOpen, setIsComponentDetailsContainerOpen }}>
            {children}
        </ChatContext.Provider>
    );
};
