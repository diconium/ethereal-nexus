"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolInvocation } from "ai";
import { SendIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EtherealNexusFileCard } from "@/components/components/create/EtherealNexusFileCard";

interface GeneratedMessageProps {
    messageId: string;
    toolInvocation: ToolInvocation;
    handleGenerateEtherealNexusStructuredFile: (result: unknown) => Promise<void>
    downloadEtherealNexusFile: (result: unknown) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: unknown, toolName: "generateJSX" | "generateEtherealNexusJSX") => void;
}

export function GeneratedJsxMessage({ messageId, toolInvocation, handleGenerateEtherealNexusStructuredFile, downloadEtherealNexusFile, handleOnComponentCardClick }: GeneratedMessageProps) {
    const { toolName, result } = toolInvocation;
    const isModified = toolName === 'generateEtherealNexusJSX';

    const onCardClick = () => {
        handleOnComponentCardClick(messageId, result, isModified ? "generateEtherealNexusJSX" : "generateJSX");
    };

    const handleFooterActionClick = () => {
        if (!isModified) {
            handleGenerateEtherealNexusStructuredFile(result);
            return;
        }

        downloadEtherealNexusFile(result);
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{result.description}</p>
                <EtherealNexusFileCard
                    id={messageId}
                    isModified={isModified}
                    fileName={result.fileName}
                    fileCode={result.code}
                    componentName={result.componentName}
                    handleClick={onCardClick} />
            </CardContent>
            <CardFooter className="justify-between items-center">
                <Button variant="text" className="text-orange-500 font-bold text-base p-0" onClick={handleFooterActionClick}>
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
