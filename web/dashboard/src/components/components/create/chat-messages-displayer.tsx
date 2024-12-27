import React, { MutableRefObject } from "react";
import { Message } from "ai";
import { UserMessage } from "@/components/components/create/user-message";
import { AssistantGeneratedMessageCard } from "@/components/components/create/assistant-message-card";
import { AssistantMessageLoader } from "@/components/components/create/assistant-message-loader";
import { ToolCallingResult } from "@/components/components/create/chat";
import { GeneratedComponentMessageType } from "@/components/components/create/utils/chat-context";

interface ChatMessagesDisplayerProps {
    chatId?: string;
    messages: Message[];
    isLoading: boolean;
    lastElementRef: MutableRefObject<HTMLDivElement | null>;
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: GeneratedComponentMessageType) => void;
    handlePublishComponent: (generatedFileName: string) => Promise<void>;
}

export function ChatMessagesDisplayer({ chatId, messages, isLoading, downloadEtherealNexusFile, handleOnComponentCardClick, lastElementRef, handlePublishComponent } : ChatMessagesDisplayerProps) {

    return (
        <div className="flex flex-1 flex-col overflow-auto p-4">
            {
                messages.length === 0 &&
                <div>No messages yet. Start a conversation!</div>
            }
            {messages?.map(message => (
            <React.Fragment key={message.id}>
                {
                    message.role === 'user' &&
                    <div className="flex mb-4 w-full justify-end">
                        <UserMessage message={message.content} />
                    </div>
                }
                {message.role !== 'user' && message.toolInvocations?.map(toolInvocation => {
                    const { id } = message;
                    const { toolCallId, state } = toolInvocation;

                    if (state === 'result') {
                        return (
                            <React.Fragment key={toolCallId}>
                                <AssistantGeneratedMessageCard
                                    chatId={chatId}
                                    messageId={id}
                                    toolInvocation={toolInvocation}
                                    handleOnComponentCardClick={handleOnComponentCardClick}
                                    downloadEtherealNexusFile={downloadEtherealNexusFile}
                                    handlePublishComponent={handlePublishComponent}
                                />
                            </React.Fragment>
                        );
                    }
                })}
            </React.Fragment>
            ))}
            {
                isLoading &&
                <div className="flex mt-auto mr-auto ml-auto mb-2 items-center z-10">
                    <AssistantMessageLoader />
                </div>
            }
            <div ref={lastElementRef} />
        </div>
    );
};
