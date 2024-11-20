"use client";

import React, { useContext, useEffect, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { FileText, Eye } from 'lucide-react';
import { ChatContext } from "@/components/components/create/utils/chatContext";
import { GeneratedFileDisplay } from "@/components/components/create/GeneratedFileDisplay";
import { Preview } from "@/components/components/create/Preview";

interface ComponentDetailsContainerProps {
    isPreviewLoading: boolean;
    previewUrl: string | null;
};

export const ComponentDetailsContainer = ({ isPreviewLoading, previewUrl } : ComponentDetailsContainerProps) => {
    const [activeTab, setActiveTab] = useState("code");
    const { currentMessage } = useContext(ChatContext);

    useEffect(() => {
        setActiveTab("code");
    }, [currentMessage]);

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="h-full flex-1 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                    <Tabs.List className="flex space-x-2">
                        {
                            currentMessage?.type === "generateJSX" &&
                            <Tabs.Trigger
                                value="preview"
                                className=" flex px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                            >
                                <Eye className="w-5 h-5 mr-2" /> Preview
                            </Tabs.Trigger>
                        }
                        <Tabs.Trigger
                            value="code"
                            className="flex px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            <FileText className="w-5 h-5 mr-2" /><></>{currentMessage?.fileName || "Code"}
                        </Tabs.Trigger>
                    </Tabs.List>
                </div>
                <div className="flex-1 min-h-0">
                    <Tabs.Content value="preview"className="h-full p-4 outline-none">
                        <Preview url={previewUrl} isLoading={isPreviewLoading} />
                    </Tabs.Content>
                    <Tabs.Content value="code" className="h-full p-4 outline-none">
                        <GeneratedFileDisplay code={currentMessage?.generatedCode || ""} />
                    </Tabs.Content>
                </div>
            </Tabs.Root>
        </div>
    )
}
