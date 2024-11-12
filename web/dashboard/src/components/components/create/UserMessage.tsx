"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserMessageProps {
    message: string;
}

export function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="flex items-start space-x-4 p-4">
            <div className="relative h-8 w-8 rounded-full border">
                <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="@shadcn" />
                    <AvatarFallback>V</AvatarFallback>
                </Avatar>
            </div>
            <div className="flex-1">
                <span className="text-sm text-muted-foreground text-foreground break-words">{message}</span>
            </div>
        </div>
    )
}
