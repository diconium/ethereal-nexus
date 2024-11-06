import React from "react";
import { Message } from "ai";
import { UserMessage } from "@/components/components/create/UserMessage";
import { GeneratedJsxMessage } from "@/components/components/create/GeneratedJsxMessage";
import { EtherealNexusFileCard } from "@/components/components/create/EtherealNexusFileCard";

interface ChatMessagesDisplayerProps {
    messages: Message[];
    chatId: string;
}

export function ChatMessagesDisplayer({ messages, chatId } : ChatMessagesDisplayerProps) {

    return (
        <div className="flex-1 p-4 overflow-auto">
            {messages?.map(message => (
                <div key={message.id} className="mb-4">
                    {
                        message.role === 'user' && <UserMessage>{message.content}</UserMessage>
                    }
                    {message.toolInvocations?.map(toolInvocation => {
                        const { toolName, toolCallId, state } = toolInvocation;
                        if (state === 'result') {
                            const { result } = toolInvocation;

                            return (
                                <div key={toolCallId}>
                                    {
                                        toolName === 'generateJSX' &&
                                        <GeneratedJsxMessage chatId={chatId} componentDescription={result.componentDescription} generatedCode={result.originalJSX} componentName={result.originalComponentName} fileName={result.fileName} />
                                    }
                                    {
                                        toolName === 'generateEtherealNexusJSX' &&
                                        <EtherealNexusFileCard fileName={result.fileName} fileCode={result.etherealNexusStructuredFile} componentName={result.componentName} />
                                    }
                                </div>
                            );
                        } else {
                            return (
                                <div key={toolCallId}>
                                    {
                                        toolName === 'generateJSX' && <div>Loading...</div>
                                    }
                                </div>
                            );
                        }
                    })}
                </div>
            ))}
        </div>
    );
};
