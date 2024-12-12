'use client';
import { Info } from 'lucide-react';

interface StatusOutputProps {
    output: string;
}

export function WebContainerStatusOutput({ output }: StatusOutputProps) {
    if (!output) return null;

    const isError = output.toLowerCase().includes('error');

    return (
        <div className={`p-4 rounded-lg ${
            isError ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
        }`}>
            <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Info className={`w-5 h-5 ${isError ? 'text-red-600' : 'text-blue-600'}`} />
                Status:
            </h2>
            <p className={`whitespace-pre-wrap font-sans break-words overflow-hidden ${isError ? 'text-red-600' : 'text-gray-600'}`}>{output}</p>
        </div>
    );
}
