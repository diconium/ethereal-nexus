"use client";

import React, { useContext } from 'react';
import {FileIcon, GitBranchIcon, TagIcon} from "lucide-react";
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
    version?: number,
}

export function ComponentFileCard({ id, fileName, componentName, handleClick, isModified, version }: EtherealNexusFileCardProps) {
    const { currentMessage } = useContext(ChatContext);
    const isSelected = currentMessage?.id === id;

    return (
        <div
            className={`bg-background rounded-md p-4 hover:shadow-md transition-all duration-300 cursor-pointer
                        ${isSelected
                ? 'border-2 border-orange-500 shadow-md ring-2 ring-orange-300'
                : 'hover:border-orange-400'}`}
            onClick={handleClick}
        >
            <div className="flex items-start space-x-3">
                <div className="relative flex-shrink-0">
                    <FileIcon className="w-6 h-6" />
                    <GitBranchIcon className="w-4 h-4 text-orange-500 absolute -top-1 -right-1" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="text-sm font-semibold break-all">{componentName}</h3>
                        <div className="flex flex-wrap gap-1">
                            {
                                isModified &&
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                                    Ethereal Nexus File
                                </Badge>
                            }
                            {
                                version &&
                                    <Badge variant="secondary" className="text-xs">
                                        <TagIcon className="w-3 h-3 mr-1" />
                                        v{version}
                                    </Badge>
                            }
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{fileName}</p>
                </div>
            </div>
        </div>
    );
}
