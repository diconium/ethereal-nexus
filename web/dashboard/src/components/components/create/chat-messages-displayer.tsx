import React, { MutableRefObject } from "react";
import { Message } from "ai";
import { UserMessage } from "@/components/components/create/user-message";
import { AssistantGeneratedMessageCard } from "@/components/components/create/assistant-message-card";
import { AssistantMessageLoader } from "@/components/components/create/assistant-message-loader";
import { ToolCallingResult } from "@/components/components/create/chat";

interface ChatMessagesDisplayerProps {
    messages: Message[];
    disabledActions: boolean;
    isLoading: boolean;
    lastElementRef: MutableRefObject<HTMLDivElement | null>;
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult) => void;
    handlePublishComponent: (messageId: string, generatedFileName: string, generatedCode: string) => Promise<void>;
}

export function ChatMessagesDisplayer({ messages, isLoading, downloadEtherealNexusFile, handleOnComponentCardClick, lastElementRef, handlePublishComponent, disabledActions } : ChatMessagesDisplayerProps) {

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
                                    messageId={id}
                                    disabledActions={disabledActions}
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
