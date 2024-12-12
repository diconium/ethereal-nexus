"use client";

import React from "react";
import { useChat } from "ai/react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolCallingResult } from "@/components/components/create/chat";
import { ComponentFileCard } from "@/components/components/create/component-file-card";
import { GeneratedComponentMessageType } from "@/components/components/create/utils/chat-context";

interface GeneratedMessageProps {
    chatId?: string;
    messageId: string;
    toolInvocation: any;
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: GeneratedComponentMessageType) => void;
}

export function AssistantGeneratedMessageCard({ chatId, messageId, toolInvocation, downloadEtherealNexusFile, handleOnComponentCardClick }: GeneratedMessageProps) {
    const { toolName, result } = toolInvocation;
    const isModified = toolName === GeneratedComponentMessageType.GENERATE_ETHEREAL_NEXUS_JSX || toolName === GeneratedComponentMessageType.UPDATE_ETHEREAL_NEXUS_JSX;

    const { isLoading: isLoadingNewMessage } = useChat({
        id: chatId,
    });

    const onCardClick = () => {
        handleOnComponentCardClick(messageId, result, toolName);
    };

    const handleFooterActionClick = () => {
        downloadEtherealNexusFile(result as ToolCallingResult);
    }

    return (
        <Card className="w-full max-w-md mb-4 rounded-lg">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">{result.description}</p>
                <ComponentFileCard
                    id={messageId}
                    fileName={result.fileName}
                    componentName={result.componentName}
                    handleClick={onCardClick} />
            </CardContent>
            <CardFooter className="justify-between items-center px-4 pt-0 pb-4">
                <Button variant="text" className="text-orange-500 text-xs font-bold p-0" onClick={handleFooterActionClick} disabled={!isModified && isLoadingNewMessage}>
                    <><DownloadIcon className="w-4 h-4 mr-2" />Download File</>
                </Button>
            </CardFooter>
        </Card>
    );
};
