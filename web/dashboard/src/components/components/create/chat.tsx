"use client";

import React, { useContext, useState, useRef, useEffect }  from 'react';
import path from 'path';
import { WebContainer } from "@webcontainer/api";
import { X, Send, StopCircle } from 'lucide-react';
import {
    cssTemplate,
    htmlTemplate,
    postcssConfigTemplate,
    tailwindConfigTemplate,
    viteConfigTemplate,
    previewTemplate,
    createIndexFileTemplate,
    getWebContainerInstance,
} from "@/lib/web-container";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";
import { ChatMessagesDisplayer } from "@/components/components/create/chat-messages-displayer";
import { WebContainerStatusOutput } from "@/components/components/create/webcontainer-status-output";
import { GeneratedCodeDetailsContainer } from "@/components/components/create/generated-code-details-container";
import { ChatContext, GeneratedComponentMessageType } from "@/components/components/create/utils/chat-context";
import { upsertNewComponent } from "@/data/components/actions";

// TODO check where this is also used
export interface ToolCallingResult {
    etherealNexusComponentMockedProps: string,
    componentName: string,
    fileName: string,
    etherealNexusFileCode: string,
    description: string,
}

interface ChatProps {
    chatId?: string;
}

export default function Chat({ chatId }: ChatProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPublishingComponent, setIsPublishingComponent] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [output, setOutput] = useState<string>('');
    const [isWebContainerBooted, setIsWebContainerBooted] = useState(false);

    const serverUrlRef = useRef<string>('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const { currentMessage, setCurrentMessage, isComponentDetailsContainerOpen, setIsComponentDetailsContainerOpen } = useContext(ChatContext);

    const { messages, input, setInput, handleSubmit, isLoading: isLoadingNewMessage, stop } = useChat({
        id: chatId,
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
                                '@ethereal-nexus/vite-plugin-ethereal-nexus': '^1.0.0',
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

            if (!serverUrlRef.current) { //happens when the user goes to another page and returns
                try {
                    await setupInitialFiles();
                } catch (error) {
                    setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
                }
            };

            try {
                setOutput('Updating component...');
                const propsToIndexFile = JSON.stringify(currentMessage.etherealNexusComponentMockedProps);
                const indexFileUpdatedTemplate = createIndexFileTemplate(currentMessage?.componentName, currentMessage?.fileName, propsToIndexFile);

                await webContainerInstance.fs.writeFile(`/${currentMessage?.fileName}`, currentMessage?.generatedCode);
                await webContainerInstance.fs.writeFile('/index.tsx', indexFileUpdatedTemplate);
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
                        etherealNexusComponentMockedProps: args.etherealNexusComponentMockedProps,
                        generatedCode: args.etherealNexusFileCode as string,
                        type: toolName as GeneratedComponentMessageType,
                    });
                    scrollToBottom();
                    setIsComponentDetailsContainerOpen(true);
                }
            });
        } else scrollToBottom();
    }, [messages, setCurrentMessage, setIsComponentDetailsContainerOpen]);

    const downloadEtherealNexusFile = async (result: ToolCallingResult) => {
        const file = new File([result.etherealNexusFileCode], result.fileName, {
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
            generatedCode: result.etherealNexusFileCode as string,
            etherealNexusComponentMockedProps: result.etherealNexusComponentMockedProps,
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

    const getMinifiedComponentFiles = async (webContainer: WebContainer) => {
        const filesMap = new Map<string, string>();
        const distNameSpace = '/dist';

        async function traverseDirectory(currentPath) {
            const entries = await webContainer.fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await traverseDirectory(fullPath);
                } else if (entry.isFile()) {
                    try {
                        const content = await webContainer.fs.readFile(fullPath, 'utf-8');
                        filesMap.set(fullPath, content);
                    } catch (error) {
                        console.error(`Error reading file ${fullPath}:`, error);
                    }
                }
            }
        }

        await traverseDirectory(distNameSpace);

        return filesMap;
    };

    const executeViteReactPlugin = async (generatedFileName: string, generatedCode: string) => {
        setIsPublishingComponent(true);
        const componentName = generatedFileName.replace('.tsx', '');
        const webContainer = await getWebContainerInstance();

        try {
            setOutput('Executing Ethereal Nexus plugin...');
            const updatedViteConfigFile = `
                import { defineConfig } from 'vite';
                import react from '@vitejs/plugin-react';
                import ethereal from '@ethereal-nexus/vite-plugin-ethereal-nexus';
                
                export default defineConfig({
                  plugins: [
                    react(),
                    ethereal({
                      exposes: {
                        ${componentName}: './${generatedFileName}',
                      },
                      server: true,
                    }),
                  ],
                  server: {
                    host: '0.0.0.0',
                    port: 5173
                  }
                });
            `;
            await webContainer.fs.writeFile(`/${generatedFileName}`, generatedCode); // for the cases where multiple components with the same name are generated
            await webContainer.fs.writeFile('/vite.config.js', updatedViteConfigFile);

            const process = await webContainer.spawn('npx', ['vite', 'build', '--mode', 'ethereal']);

            process.output.pipeTo(new WritableStream({
                write(data) {
                    setOutput(prev => `${prev}\n${data}`);
                }
            }));

            const exitCode = await process.exit;
            if (exitCode === 0) {
                // setOutput('Ethereal Nexus execution completed successfully!');
                const minifiedFiles = await getMinifiedComponentFiles(webContainer); // TODO CHECK IF WE NEED TO DELETE ALL THE FILES FROM DIST FOLDER BEFORE ADDING NEW ONES
                const formData = new FormData()

                for (const [key, value] of minifiedFiles) {
                    formData.append(key, value);
                }

                await upsertNewComponent(formData, componentName);
                setIsPublishingComponent(false);
            } else {
                // throw new Error('Ethereal Nexus execution failed');
                console.log('Ethereal Nexus execution failed');
                setIsPublishingComponent(false);
            }
        } catch (error) {
            console.error('Error executing Ethereal Nexus:', error);
            setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            setIsPublishingComponent(false);
        }
    };

    return (
        <div className="flex h-full bg-gray-100">
            <div className={`flex flex-col ${isComponentDetailsContainerOpen ? 'w-1/2' : 'w-full'} transition-all duration-300 ease-in-out`}>
                <div className="flex flex-1 flex-col overflow-auto relative">
                    <ChatMessagesDisplayer
                        messages={messages}
                        lastElementRef={messagesEndRef}
                        disabledActions={isPublishingComponent || isLoadingNewMessage}
                        isLoading={isLoadingNewMessage}
                        downloadEtherealNexusFile={downloadEtherealNexusFile}
                        handleOnComponentCardClick={handleOnComponentCardClick}
                        handlePublishComponent={executeViteReactPlugin}
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
                            {
                                !isLoadingNewMessage ?
                                    <Button disabled={isPublishingComponent} type="submit" className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 h-full">
                                        <Send className="h-5 w-5" />
                                    </Button>
                                    :
                                    <Button disabled={isPublishingComponent} type="button" onClick={() => stop()} className="px-4 py-2 text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 h-full">
                                        <StopCircle className="h-5 w-5" />
                                    </Button>
                            }
                        </div>
                    </form>
                </div>
            </div>

            {/* Preview section */}
            {isComponentDetailsContainerOpen && (
                <div className="w-1/2 border-l relative flex flex-col">
                    <div className="flex flex-1 flex-col overflow-auto relative">
                        <Button
                            variant="ghost"
                            className="absolute top-2 right-2 z-10 p-1 h-8 w-8 rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            onClick={closeComponentDetailsContainer}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        <GeneratedCodeDetailsContainer previewUrl={previewUrl} isPreviewLoading={isPreviewLoading} />
                    </div>
                    <div className="mx-6 mb-6">
                        <WebContainerStatusOutput output={output} />
                    </div>
                </div>
            )}
        </div>
    )
}