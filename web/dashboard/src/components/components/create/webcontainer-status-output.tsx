'use client';

import { useState } from 'react';
import { Info, Pause, CheckCircle, X, Terminal } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

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
    const [isOpen, setIsOpen] = useState(false);

    if (!output) return null;

    const isError = output.status === 'Error';
    const icon = statusIcons[output.status];
    const lines = output.message.split('\n').filter(line => line.trim());

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className={`z-1 fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full shadow-lg 
                        hover:bg-gray-800 hover:scale-105 hover:shadow-xl
                        transition-all duration-300 ease-in-out
                        ${output.status === 'Executing' ? 'motion-safe:animate-bounce-gentle' : ''}`}
                >
                    <Terminal className="w-4 h-4" />
                    <span className="text-sm font-medium">Logs</span>
                    {isError && (
                    <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    )}
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className={`w-4 h-4 ${isError ? 'text-red-600' : 'text-blue-600'}`} />
                        WebContainer Logs
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-4 flex-1 overflow-auto">
                    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            {icon}
                            Status:
                        </h2>
                        {lines.map((line, index) => (
                            <div key={index} >
                                <p className={`whitespace-pre-wrap font-sans break-words overflow-hidden ${isError ? 'text-red-600' : 'text-white'}`}>{line}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
