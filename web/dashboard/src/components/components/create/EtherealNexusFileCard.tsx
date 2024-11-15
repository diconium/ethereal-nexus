"use client";

import React, { useContext } from 'react';
import { FileIcon, GitBranchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChatContext } from "@/components/components/create/utils/chatContext";

interface EtherealNexusFileCardProps {
    id: string,
    componentName: string,
    fileName: string,
    handleClick: () => void,
    isModified: boolean,
}

// TODO update Name
export function EtherealNexusFileCard({ id, fileName, componentName, handleClick, isModified }: EtherealNexusFileCardProps) {
    const { currentMessage } = useContext(ChatContext);
    const isSelected = currentMessage?.id === id;

    return (
        <Card className={`w-full max-w-md hover:shadow-lg transition-shadow duration-300 cursor-pointer ${isSelected ? 'border-2 border-orange-500' : 'border-l-2 border-l-orange-500'}`}>
            <Button variant="ghost" className="w-full h-full p-0 justify-start rounded-xl" onClick={handleClick}>
                <CardHeader className="flex flex-row items-center space-x-4 p-6">
                    <div className="relative">
                        <FileIcon className="w-8 h-8" />
                        {
                            isModified && <GitBranchIcon className="w-4 h-4 text-orange-500 absolute -top-1 -right-1" />
                        }
                    </div>
                    <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                            <CardTitle className="text-xl font-semibold">{componentName}</CardTitle>
                            {
                                isModified &&
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                                    Ethereal Nexus File
                                </Badge>
                            }
                        </div>
                        <CardDescription className="text-sm text-muted-foreground">{fileName}</CardDescription>
                    </div>
                </CardHeader>
            </Button>
        </Card>
    )
}
