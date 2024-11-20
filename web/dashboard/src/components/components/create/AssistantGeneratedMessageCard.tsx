"use client";

import React from "react";
import { useChat } from "ai/react";
import { SendIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolCallingResult, CHAT_ID } from "@/components/components/create/Chat";
import { ComponentFileCard } from "@/components/components/create/ComponentFileCard";

interface GeneratedMessageProps {
    messageId: string;
    toolInvocation: any;
    handleGenerateEtherealNexusStructuredFile: (result: ToolCallingResult) => Promise<void>
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: "generateJSX" | "generateEtherealNexusJSX") => void;
}

export function AssistantGeneratedMessageCard({ messageId, toolInvocation, handleGenerateEtherealNexusStructuredFile, downloadEtherealNexusFile, handleOnComponentCardClick }: GeneratedMessageProps) {
    const { toolName, result } = toolInvocation;
    const isModified = toolName === 'generateEtherealNexusJSX';

    const { isLoading: isLoadingNewMessage } = useChat({
        id: CHAT_ID,
    });

    const onCardClick = () => {
        handleOnComponentCardClick(messageId, result, isModified ? "generateEtherealNexusJSX" : "generateJSX");
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
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{result.description}</p>
                <ComponentFileCard
                    id={messageId}
                    isModified={isModified}
                    fileName={result.fileName}
                    componentName={result.componentName}
                    handleClick={onCardClick} />
            </CardContent>
            <CardFooter className="justify-between items-center">
                <Button variant="text" className="text-orange-500 font-bold text-base p-0" onClick={handleFooterActionClick} disabled={!isModified && isLoadingNewMessage}>
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
