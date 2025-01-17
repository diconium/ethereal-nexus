"use client";

import React, { createContext, useState } from 'react';

export enum GeneratedComponentMessageType {
    GENERATE_ETHEREAL_NEXUS_JSX = "generateEtherealNexusJSX",
    UPDATE_ETHEREAL_NEXUS_JSX = "updateEtherealNexusJSX",
}

export interface GeneratedComponentMessage {
    id: string;
    componentName: string;
    fileName: string;
    generatedCode: string;
    etherealNexusComponentMockedProps: any; // TODO: Define type
    type: GeneratedComponentMessageType;
};

interface ChatContextType {
    currentMessage?: GeneratedComponentMessage;
    setCurrentMessage: (message?: GeneratedComponentMessage) => void;
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
