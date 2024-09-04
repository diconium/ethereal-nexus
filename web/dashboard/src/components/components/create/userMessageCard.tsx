"use client";

import React from "react";

export function UserMessage({ children } : { children: React.ReactNode }) {
    return (
        <div className="border border-gray-300 rounded-lg p-4 flex items-start gap-4 text-sm">
            <div className="grid gap-1">
                <div className="flex items-center gap-2">
                    <div className="font-semibold">USER</div>
                </div>
                <div className="prose text-muted-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}
