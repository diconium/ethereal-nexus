import React from "react";
import { Message } from "ai";
import { UserMessage } from "@/components/components/create/UserMessage";
import { AssistantGeneratedMessageCard } from "@/components/components/create/AssistantGeneratedMessageCard";
import { LoadingAssistantMessage } from "@/components/components/create/LoadingAssistantMessage";
import { NEW_MESSAGE_NAME, ToolCallingResult } from "@/components/components/create/Chat";

interface ChatMessagesDisplayerProps {
    messages: Message[];
    isLoading: boolean;
    handleGenerateEtherealNexusStructuredFile: (result: ToolCallingResult) => Promise<void>;
    downloadEtherealNexusFile: (result: ToolCallingResult) => Promise<void>;
    handleOnComponentCardClick: (messageId: string, result: ToolCallingResult, toolName: "generateJSX" | "generateEtherealNexusJSX") => void;
}

export function ChatMessagesDisplayer({ messages, isLoading, handleGenerateEtherealNexusStructuredFile, downloadEtherealNexusFile, handleOnComponentCardClick } : ChatMessagesDisplayerProps) {

    return (
        <div className="flex-1 p-4 overflow-auto">
            <UserMessage message="An interactive pricing calculator for a SaaS product which takes into account seats, usage, and possible discounts. The calculator should be interactable, the monthly usage should be a slider and the total price should update accordingly" />
            <UserMessage message={"A card with an avatar a description and a name. Close to the name you should include a badge that indicates if the user is verified. Bellow the description there should be an indication if the user is a male or a female and with his birthdate also add in the end the user will have a list of his favorite podcasts"} />
            {messages?.map(message => (
                <React.Fragment key={message.id}>
                    {
                        message.role === 'user' && <UserMessage message={message.name === NEW_MESSAGE_NAME ? message.content.split('///File code:')[0].toString() : message.content} />
                    }
                    {message.role !== 'user' && message.toolInvocations?.map(toolInvocation => {
                        const { id } = message;
                        const { toolCallId, state } = toolInvocation;

                        if (state === 'result') {
                            return (
                                <React.Fragment key={toolCallId}>
                                    <AssistantGeneratedMessageCard
                                        messageId={id}
                                        toolInvocation={toolInvocation}
                                        handleOnComponentCardClick={handleOnComponentCardClick}
                                        downloadEtherealNexusFile={downloadEtherealNexusFile}
                                        handleGenerateEtherealNexusStructuredFile={handleGenerateEtherealNexusStructuredFile}
                                    />
                                </React.Fragment>
                            );
                        }
                    })}
                </React.Fragment>
            ))}
            {isLoading && <LoadingAssistantMessage />}
        </div>
    );
};
