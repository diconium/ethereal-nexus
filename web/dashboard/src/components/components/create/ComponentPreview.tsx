"use client";

import React, {useContext, useState} from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Frame, { FrameContextConsumer } from "react-frame-component";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {MessageContext} from "@/components/components/create/utils/messageContext";

export const ComponentPreview = () => {
    const [activeTab, setActiveTab] = useState("preview");
    const { currentMessage } = useContext(MessageContext);
    console.log("currentMessage", currentMessage);

    const StickyHeaderComponent = () => {
        const [isScrolled, setIsScrolled] = useState(false)

        const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop } = event.currentTarget
            setIsScrolled(scrollTop > 50)
        }

        return (
            <div className="min-h-screen bg-gray-100" onScroll={handleScroll}>
                <header
                    className={`sticky top-0 z-50 transition-all duration-300 ease-in-out ${
                        isScrolled
                            ? 'h-16 bg-white/70 backdrop-blur-md shadow-md'
                            : 'h-24 bg-white'
                    }`}
                >
                    <div className="container mx-auto px-4 h-full flex items-center justify-between">
                        <h1 className={`font-bold transition-all duration-300 ease-in-out ${
                            isScrolled ? 'text-xl' : 'text-3xl'
                        }`}>
                            Sticky Header
                        </h1>
                        <nav>
                            <ul className="flex space-x-4">
                                <li><a href="#" className="text-gray-600 hover:text-gray-900">Home</a></li>
                                <li><a href="#" className="text-gray-600 hover:text-gray-900">About</a></li>
                                <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact</a></li>
                            </ul>
                        </nav>
                    </div>
                </header>
                <main className="container mx-auto px-4 pt-32">
                    <h2 className="text-2xl font-bold mb-4">Welcome to our website</h2>
                    {[...Array(20)].map((_, index) => (
                        <p key={index} className="mb-4">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>
                    ))}
                </main>
            </div>
        )
    }

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
                    <div className="flex items-center space-x-2">
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Copy
                        </button>
                        <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            View
                        </button>
                    </div>
                </div>
                <Tabs.Content value="preview" className="p-0 flex-1">
                    <div className="w-full h-full bg-white">
                        <Frame style={{width: '100%', height: '100%', border: 'none'}}>
                            <FrameContextConsumer>
                                {({ document, window }) => (
                                    <>
                                        <style>{`
                      @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
                    `}</style>
                                        <StickyHeaderComponent />
                                    </>
                                )}
                            </FrameContextConsumer>
                        </Frame>
                    </div>
                </Tabs.Content>
                <Tabs.Content value="code" className="p-0 flex-1">
                    <ScrollArea.Root className="h-full">
                        <ScrollArea.Viewport className="w-full h-full">
              <pre className="p-4 bg-gray-100">
                <code className="text-sm">{StickyHeaderComponent.toString()}</code>
              </pre>
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar
                            className="flex select-none touch-none p-0.5 bg-gray-200 transition-colors duration-[160ms] ease-out hover:bg-gray-300 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                            orientation="vertical"
                        >
                            <ScrollArea.Thumb className="flex-1 bg-gray-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                        </ScrollArea.Scrollbar>
                    </ScrollArea.Root>
                </Tabs.Content>
            </Tabs.Root>
        </div>
    )
}
