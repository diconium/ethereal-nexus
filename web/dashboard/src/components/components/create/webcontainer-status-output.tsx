'use client';

import React, { useState } from 'react';
import { Info, Pause, CheckCircle, X, Terminal } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";

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

    const logsEndRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [output?.message, isOpen]);

    if (!output) return null;

    const isError = output.status === 'Error';
    const icon = statusIcons[output.status];
    const lines = output.message.split('\n').filter(line => line.trim());

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    className={`z-10 fixed bottom-40 right-11 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full shadow-lg 
                        hover:bg-gray-800 hover:scale-105 hover:shadow-xl
                        transition-all duration-300 ease-in-out
                        ${output.status === 'Executing' ? 'motion-safe:animate-bounce-gentle' : ''}`}
                >
                    <Terminal className="w-4 h-4" />
                    <span className="text-sm font-medium">Logs</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="webcontainer-output">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className={`w-4 h-4 ${isError ? 'text-red-600' : 'text-blue-600'}`} />
                        WebContainer Logs
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-sm text-gray-500">
                    Real-time logs from the WebContainer instance showing build progress, errors, and server status.
                    {isError && (
                        <span className="block mt-1 text-red-500">
                            ⚠️ There are errors in the logs that need attention.
                        </span>
                    )}
                </DialogDescription>
                <div className="mt-4 flex-1 overflow-auto">
                    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
                        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            {icon}
                            Status:
                        </h2>
                        {lines.map((line, index) => (
                            <div key={index} >
                                <p className={`whitespace-pre-wrap font-sans break-words overflow-hidden ${isError ? 'text-red-600' : 'text-white'}`}>{line}</p>
                            </div>
                        ))}
                    </div>
                    <div ref={logsEndRef} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
