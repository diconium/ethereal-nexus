'use client';
import { Info, Pause, CheckCircle, X } from 'lucide-react';
import { StatusOutputType } from "@/components/components/create/chat";

interface StatusOutputProps {
    output: StatusOutputType | undefined;
}

const statusIcons = {
    Error: <X className="w-5 h-5 text-red-600" />,
    Success: <CheckCircle className="w-5 h-5 text-green-600" />,
    Executing: <Pause className="w-5 h-5 text-blue-600" />,
    Info: <Info className="w-5 h-5 text-blue-600" />
};

export function WebContainerStatusOutput({ output }: StatusOutputProps) {
    if (!output) return null;

    const isError = output.status === 'Error';
    const icon = statusIcons[output.status];

    return (
        <div className={`p-4 rounded-lg overflow-auto max-h-40 ${
            isError ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'
        }`}>
            <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
                {icon}
                Status:
            </h2>
            <p className={`whitespace-pre-wrap font-sans break-words overflow-hidden ${isError ? 'text-red-600' : 'text-gray-600'}`}>{output.message}</p>
        </div>
    );
}
