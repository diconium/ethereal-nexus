"use client";

import React, { useContext, useState, useRef, useEffect }  from 'react';
import { X } from 'lucide-react';
import {
    previewTemplate,
    cssTemplate,
    htmlTemplate,
    postcssConfigTemplate,
    tailwindConfigTemplate,
    viteConfigTemplate,
    getWebContainerInstance,
} from "@/lib/web-container";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";
import { ChatMessagesDisplayer } from "@/components/components/create/ChatMessagesDisplayer";
import { ComponentDetailsContainer } from "@/components/components/create/ComponentDetailsContainer";
import { ChatContext, GeneratedComponentMessageType } from "@/components/components/create/utils/chatContext";

export const CHAT_ID = "ethereal-nexus-component-generation-chat";

// TODO check where this is also used
export interface ToolCallingResult {
    indexFileCode: string,
    componentName: string,
    fileName: string,
    code: string,
    description: string,
}

export default function Chat() {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [output, setOutput] = useState<string>('');
    const [isWebContainerBooted, setIsWebContainerBooted] = useState(false);

    const serverUrlRef = useRef<string>('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const { currentMessage, setCurrentMessage, isComponentDetailsContainerOpen, setIsComponentDetailsContainerOpen } = useContext(ChatContext);

    const { messages, input, setInput, handleSubmit, isLoading: isLoadingNewMessage } = useChat({
        id: CHAT_ID,
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
        });
    };

    const setupInitialFiles = async () => {
        const webContainer = await getWebContainerInstance();

        try {
            setOutput('Creating project files...');
            await webContainer.mount({
                'index.html': {
                    file: { contents: htmlTemplate },
                },
                'styles.css': {
                    file: { contents: cssTemplate },
                },
                'index.tsx': {
                    file: { contents: previewTemplate },
                },
                'vite.config.js': {
                    file: { contents: viteConfigTemplate },
                },
                'tailwind.config.js': {
                    file: { contents: tailwindConfigTemplate },
                },
                'postcss.config.js': {
                    file: { contents: postcssConfigTemplate },
                },
                'package.json': {
                    file: {
                        contents: JSON.stringify({
                            name: 'preview-component',
                            type: 'module',
                            dependencies: {
                                'react': '^18.2.0',
                                'react-dom': '^18.2.0',
                                '@ethereal-nexus/core': '1.5.0',
                            },
                            devDependencies: {
                                '@vitejs/plugin-react': '^4.2.1',
                                'vite': '^5.1.4',
                                '@types/react': '^18.2.0',
                                '@types/react-dom': '^18.2.0',
                                'tailwindcss': '^3.4.1',
                                'autoprefixer': '^10.4.18',
                                'postcss': '^8.4.35'
                            }
                        }),
                    },
                },
            });

            setOutput('Installing dependencies...');
            const installProcess = await webContainer.spawn('npm', ['install']);

            installProcess.output.pipeTo(new WritableStream({
                write(data) {
                    setOutput(prev => `${prev}\n${data}`);
                }
            }));

            const installExitCode = await installProcess.exit;

            if (installExitCode !== 0) {
                throw new Error('Installation failed');
            }

            setOutput('Starting development server...');
            const devProcess = await webContainer.spawn('npx', ['vite']);

            devProcess.output.pipeTo(new WritableStream({
                write(data) {
                    if (data.includes('Local:')) {
                        const url = data.match(/Local:\s+(http:\/\/localhost:\d+)/)?.[1];
                        if (url) {
                            serverUrlRef.current = url;
                            setPreviewUrl(url);
                            setOutput('Component preview is ready!');
                        }
                    }
                }
            }));

            webContainer.on('server-ready', (port, url) => {
                serverUrlRef.current = url;
                setPreviewUrl(url);
                setOutput('Component preview is ready!');
            });

        } catch (error) {
            setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        } finally {
            setIsWebContainerBooted(false);
            setIsPreviewLoading(false);
        }
    };

    useEffect(() => {
        const bootWebContainer = async () => {
            // loads the web container when the chat is being loaded
            if (messages.length === 0 && !isWebContainerBooted) {
                setIsPreviewLoading(true);
                setOutput('Starting WebContainer...');
                try {
                    await setupInitialFiles();
                } catch (error) {
                    setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
                }
            }
        };
        bootWebContainer().then(() => setOutput('WebContainer booted!'));
    }, [messages, isWebContainerBooted]);

    useEffect(() => {
        const updateComponent = async () => {
            if (!currentMessage) return;
            const webContainerInstance = await getWebContainerInstance();
            if (!serverUrlRef.current) return;

            try {
                setOutput('Updating component...');
                await webContainerInstance.fs.writeFile(`/${currentMessage?.fileName}`, currentMessage?.generatedCode);
                await webContainerInstance.fs.writeFile('/index.tsx', currentMessage?.indexFileCode);
                setOutput('Component updated successfully!');
            } catch (error) {
                setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            }
        };

        updateComponent();
    }, [currentMessage]);

    useEffect(() => {
        // Make the new added message the current one
        const lastReceivedMessage = messages[messages.length - 1];

        if (lastReceivedMessage && lastReceivedMessage.role !== 'user') {
            lastReceivedMessage.toolInvocations?.map(toolInvocation => {
                const { toolName, args } = toolInvocation;
                if (Object.values(GeneratedComponentMessageType).includes(toolName as GeneratedComponentMessageType)) {
                    setCurrentMessage({
                        id: lastReceivedMessage.id as string,
                        componentName: args.componentName as string,
                        fileName: args.fileName as string,
                        generatedCode: args.code as string,
                        indexFileCode: args.indexFileCode as string,
                        version: args.version ? args.version : undefined,
                        type: toolName as GeneratedComponentMessageType,
                    });
                    scrollToBottom();
                    setIsComponentDetailsContainerOpen(true);
                }
            });
        } else scrollToBottom();
    }, [messages, setCurrentMessage, setIsComponentDetailsContainerOpen]);

    const downloadEtherealNexusFile = async (result: ToolCallingResult) => {
        const file = new File([result.code], result.fileName, {
            type: 'text/plain',
        })

        const link = document.createElement('a');
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleOnComponentCardClick = (messageId: string, result: ToolCallingResult, toolName: GeneratedComponentMessageType) => {
        if (currentMessage?.id === messageId) {
            setCurrentMessage(undefined);
            setIsComponentDetailsContainerOpen(false);
            return;
        }

        setCurrentMessage({
            id: messageId as string,
            componentName: result.componentName as string,
            fileName: result.fileName as string,
            generatedCode: result.code as string,
            indexFileCode: result.indexFileCode as string,
            type: toolName,
        });
        setIsComponentDetailsContainerOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (isLoadingNewMessage) return;
            e.preventDefault();
            handleSubmit();
        }
    };

    const closeComponentDetailsContainer = () => {
        setCurrentMessage(undefined);
        setIsComponentDetailsContainerOpen(false);
    };

    return (
        <div className="flex h-full bg-gray-100">
            <div className={`flex flex-col ${isComponentDetailsContainerOpen ? 'w-1/2' : 'w-full'} transition-all duration-300 ease-in-out`}>
                <div className="flex flex-1 flex-col overflow-auto relative">
                    <ChatMessagesDisplayer
                        messages={messages}
                        lastElementRef={messagesEndRef}
                        isLoading={isLoadingNewMessage}
                        downloadEtherealNexusFile={downloadEtherealNexusFile}
                        handleOnComponentCardClick={handleOnComponentCardClick}
                    />
                </div>
                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <TextArea
                            placeholder="Describe the UI that you want to generate..."
                            rows={3}
                            onKeyDown={handleKeyDown}
                            value={input}
                            onChange={event => {
                                setInput(event.target.value);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus-visible:ring-orange-600 focus-visible:border-transparent" />
                        <div className="flex">
                            <Button type="submit" disabled={isLoadingNewMessage} className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 h-full">Send</Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Preview section */}
            {isComponentDetailsContainerOpen && (
                <div className="w-1/2 border-l relative">
                    <Button
                        variant="ghost"
                        className="absolute top-2 right-2 z-10 p-1 h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        onClick={closeComponentDetailsContainer}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <ComponentDetailsContainer previewUrl={previewUrl} isPreviewLoading={isPreviewLoading}/>
                </div>
            )}
        </div>
    )
}
