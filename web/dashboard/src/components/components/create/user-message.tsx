"use client";

import React from "react";

interface UserMessageProps {
    message: string;
}

export function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="bg-white rounded-lg shadow p-4 max-w-96">
            <pre className="whitespace-pre-wrap font-sans break-words overflow-hidden">{message}</pre>
        </div>
    )
};
