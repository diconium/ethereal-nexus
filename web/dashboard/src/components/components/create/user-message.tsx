"use client";

import React from "react";

interface UserMessageProps {
    message: string;
}

export function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="bg-white rounded-lg shadow-sm p-4 max-w-96">
            <pre className="whitespace-pre-wrap font-sans wrap-break-word overflow-hidden">{message}</pre>
        </div>
    )
};
