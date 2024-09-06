"use client"

import React from 'react';
import SourceCodeIcon from "@/components/ui/icons/SourceCodeIcon";
import PreviewCodeIcon from "@/components/ui/icons/PreviewCodeIcon";

export function ToogleCodePreviewUI({ previewCode, updateViewMode }) {
    return (
        <div className="flex items-center h-9 p-2 bg-gray-300 rounded-full bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80">
            <button className="mr-1" onClick={updateViewMode} disabled={previewCode}>
                {!previewCode ? (
                    <SourceCodeIcon width={25} height={25} fill="#575758" />
                ) : (
                    <SourceCodeIcon width={25} height={25} fill="rgb(249 115 22 / var(--tw-bg-opacity))" />
                )}
            </button>
            <button onClick={updateViewMode} disabled={!previewCode}>
                {previewCode ? (
                    <PreviewCodeIcon width={25} height={25} fill="#575758" />
                ) : (
                    <PreviewCodeIcon width={25} height={25} fill="rgb(249 115 22 / var(--tw-bg-opacity))" />
                )}
            </button>
        </div>
    );
}
