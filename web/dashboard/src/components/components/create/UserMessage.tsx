"use client";

import React from "react";

interface UserMessageProps {
    message: string;
}

export function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="flex space-x-4 p-4 border rounded-lg max-w-2xl">
            <div className="flex-1">
                <span className="text-sm text-foreground break-words">{message}</span>
            </div>
        </div>
    )
}
