import React from 'react';
import { Loader2 } from 'lucide-react';
import { ChatContext } from "@/components/components/create/utils/chat-context";

interface ComponentPreviewerProps {
    url: string | null;
    isLoading: boolean;
}

export function ComponentPreviewer({ url, isLoading }: ComponentPreviewerProps) {
    const { currentMessage } = React.useContext(ChatContext);

    return (
        <>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Loading preview...</p>
                </div>
            ) : url ? (
                <iframe
                    id={`iframe-${currentMessage?.id}`}
                    src={url}
                    className="w-full h-full flex-1 border-0"
                    title="Component Preview"
                    sandbox="allow-scripts allow-same-origin"
                />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Generated component preview will appear here
                </div>
            )}
        </>
    );
}
