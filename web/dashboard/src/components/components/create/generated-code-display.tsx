"use client";

import React  from 'react';

interface GeneratedFileDisplayProps {
    code: string;
};

export const GeneratedCodeDisplay = ({ code }: GeneratedFileDisplayProps) => {
    return (
        <div className="h-full">
            <pre className="bg-gray-900 rounded-lg text-gray-100 h-full p-4 overflow-auto text-sm">
                <code>{code}</code>
            </pre>
        </div>
    );
};
