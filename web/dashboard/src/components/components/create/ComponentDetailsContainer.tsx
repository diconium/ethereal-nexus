"use client";

import React, {useContext, useState} from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { LivePreview, LiveProvider } from "react-live";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { MessageContext } from "@/components/components/create/utils/messageContext";
import { GeneratedCodeDisplay } from "@/components/components/create/generatedCodeDisplay";

export const ComponentDetailsContainer = () => {
    const [activeTab, setActiveTab] = useState("preview");
    const { currentMessage } = useContext(MessageContext);

    return (
        <div className="border rounded-lg overflow-hidden h-full flex flex-col">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                    <Tabs.List className="flex space-x-2">
                        <Tabs.Trigger
                            value="preview"
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            Preview
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="code"
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                        >
                            Code
                        </Tabs.Trigger>
                    </Tabs.List>
                </div>
                <LiveProvider code={currentMessage?.generatedCode || ""}>
                    <Tabs.Content value="preview" className="p-0 flex-1">
                        <div className="w-full h-full bg-white">
                            {/** <Frame style={{width: '100%', height: '100%', border: 'none'}}>
                                <FrameContextConsumer>
                                    {({ document, window }) => (
                                        <>
                                            <style>{`
                          @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
                        `}</style>
                                            {currentMessage?.generatedCode}
                                        </>
                                    )}
                                </FrameContextConsumer>
                            </Frame>**/}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <div className="rounded p-4">
                                            <LivePreview />
                                        </div>
                                    </div>
                                </div>
                        </div>

                    </Tabs.Content>
                    <Tabs.Content value="code" className="p-0 flex-1">
                        <ScrollArea.Root className="h-full">
                            <ScrollArea.Viewport className="w-full h-full">
                                <GeneratedCodeDisplay generatedCode={currentMessage?.generatedCode || ""} />
                                {/**<LiveEditor className="rounded border" />
                                <LiveError className="text-red-500 mt-2" /> **/}
                            </ScrollArea.Viewport>
                            <ScrollArea.Scrollbar
                                className="flex select-none touch-none p-0.5 bg-gray-200 transition-colors duration-[160ms] ease-out hover:bg-gray-300 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                                orientation="vertical"
                            >
                                <ScrollArea.Thumb className="flex-1 bg-gray-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                            </ScrollArea.Scrollbar>
                        </ScrollArea.Root>
                    </Tabs.Content>
                </LiveProvider>
            </Tabs.Root>
        </div>
    )
}
