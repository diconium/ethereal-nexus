"use client";

import React from "react";
import { useChat } from "ai/react";
import { DownloadIcon, ArrowBigUpDash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolCallingResult } from "@/components/components/create/chat";
import { ComponentFileCard } from "@/components/components/create/component-file-card";
import { GeneratedComponentMessageType } from "@/components/components/create/utils/chat-context";

interface GeneratedMessageProps {
    messageId: string;
    disabledActions: boolean;
    toolInvocation: any;
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: GeneratedComponentMessageType) => void;
    handlePublishComponent: (generatedFileName: string, generatedCode: string) => Promise<void>;
}

export function AssistantGeneratedMessageCard({ messageId, toolInvocation, downloadEtherealNexusFile, handleOnComponentCardClick, handlePublishComponent, disabledActions }: GeneratedMessageProps) {
    const { toolName, result } = toolInvocation;

    const onCardClick = () => {
        handleOnComponentCardClick(messageId, result, toolName);
    };

    const handleFooterActionClick = () => {
        downloadEtherealNexusFile(result as ToolCallingResult);
    };

    const publishComponent = async () => {
      await handlePublishComponent(result.fileName, result.etherealNexusFileCode);
    };

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
                <Button variant="text" className="text-orange-500 text-xs font-bold p-0" onClick={handleFooterActionClick} disabled={disabledActions}>
                    <><DownloadIcon className="w-4 h-4 mr-2" />Download File</>
                </Button>
                <Button variant="text" className="text-orange-500 text-xs font-bold p-0" onClick={publishComponent} disabled={disabledActions}>
                    <><ArrowBigUpDash className="w-5 h-5 mr-2" />Publish Component</>
                </Button>
            </CardFooter>
        </Card>
    );
};
