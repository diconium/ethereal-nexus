"use client";

import React from "react";
import { useChat } from "ai/react";
import { SendIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolCallingResult, CHAT_ID } from "@/components/components/create/Chat";
import { ComponentFileCard } from "@/components/components/create/ComponentFileCard";
import { GeneratedComponentMessageType } from "@/components/components/create/utils/chatContext";

interface GeneratedMessageProps {
    messageId: string;
    toolInvocation: any;
    handleGenerateEtherealNexusStructuredFile: (result: ToolCallingResult) => Promise<void>
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: GeneratedComponentMessageType) => void;
}

export function AssistantGeneratedMessageCard({ messageId, toolInvocation, handleGenerateEtherealNexusStructuredFile, downloadEtherealNexusFile, handleOnComponentCardClick }: GeneratedMessageProps) {
    const { toolName, result } = toolInvocation;
    const isModified = toolName === GeneratedComponentMessageType.GENERATE_ETHEREAL_NEXUS_JSX || toolName === GeneratedComponentMessageType.UPDATE_ETHEREAL_NEXUS_JSX;

    const { isLoading: isLoadingNewMessage } = useChat({
        id: CHAT_ID,
    });

    const onCardClick = () => {
        handleOnComponentCardClick(messageId, result, toolName);
    };

    const handleFooterActionClick = () => {
        if (!isModified) {
            handleGenerateEtherealNexusStructuredFile(result as ToolCallingResult);
            return;
        }

        downloadEtherealNexusFile(result as ToolCallingResult);
    }

    return (
        <Card className="w-full max-w-2xl mb-4 rounded-lg">
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">{result.description}</p>
                <ComponentFileCard
                    id={messageId}
                    isModified={isModified}
                    fileName={result.fileName}
                    version={result.version}
                    componentName={result.componentName}
                    handleClick={onCardClick} />
            </CardContent>
            <CardFooter className="justify-between items-center px-4 pt-0 pb-4">
                <Button variant="text" className="text-orange-500 text-xs font-bold p-0" onClick={handleFooterActionClick} disabled={!isModified && isLoadingNewMessage}>
                    {
                        !isModified ?
                            <><SendIcon className="mr-2 h-4 w-4" />Generate Ethereal Nexus Structured File</> :
                            <><DownloadIcon className="w-4 h-4 mr-2" />Download File</>
                    }
                </Button>
            </CardFooter>
        </Card>
    );
};
