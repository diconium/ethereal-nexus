"use client";
// TODO ADD MESSAGES TYPES
import React, { createContext, useState } from 'react';

export const MessageContext = createContext({
    currentMessage: {},
    setCurrentMessage: (message: any) => message,
});

export const MessagesProvider = ({ children }) => {
    const [currentMessage, setCurrentMessage] = useState(null);

    return (
        <MessageContext.Provider value={{ currentMessage, setCurrentMessage }}>
            {children}
        </MessageContext.Provider>
    );
};
