import React from "react";

export function LoadingAssistantMessage() {
    return (
        <div className="flex space-x-4 p-4">
            <div className="flex items-center space-x-2 mr-2">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Loading component...</p>
        </div>
    );
}
