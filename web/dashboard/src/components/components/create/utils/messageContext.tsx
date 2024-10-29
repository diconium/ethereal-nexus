"use client";

import React, { createContext, useState } from 'react';

export type Message = {
    componentName: string;
    fileName: string;
    generatedCode: string;
};

type MessageContextType = {
    currentMessage?: Message;
    setCurrentMessage: (message: Message) => void;
};

export const MessageContext = createContext<MessageContextType>({
    currentMessage: undefined,
    setCurrentMessage: (message: Message) => message,
});

export const MessagesProvider = ({ children }) => {
    const [currentMessage, setCurrentMessage] = useState(null);

    return (
        <MessageContext.Provider value={{ currentMessage, setCurrentMessage }}>
            {children}
        </MessageContext.Provider>
    );
};
