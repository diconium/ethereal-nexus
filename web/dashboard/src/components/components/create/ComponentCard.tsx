"use client";

import { useContext } from "react";
import { FileIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatContext } from "@/components/components/create/utils/chatContext";

interface ComponentCardProps {
    componentName: string;
    fileName: string;
    generatedCode: string;
};

export function ComponentCard({ componentName, fileName, generatedCode }: ComponentCardProps) {

    const { setCurrentMessage, setIsComponentDetailsContainerOpen } = useContext(ChatContext);

    const handleClick = () => {
        setCurrentMessage({
            componentName,
            fileName,
            generatedCode,
            type: 'generateJSX',
        });
        setIsComponentDetailsContainerOpen(true);
    };

    return (
        <Card className="w-full max-w-md hover:shadow-lg transition-shadow duration-300 cursor-pointer" onClick={handleClick}>
            <Button variant="ghost" className="w-full h-full p-0 justify-start">
                <CardHeader className="flex flex-row items-center space-x-4 p-6">
                    <FileIcon className="w-8 h-8 text-primary" />
                    <div className="flex-1 text-left">
                        <CardTitle className="text-xl font-semibold">{componentName}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">{fileName}</CardDescription>
                    </div>
                </CardHeader>
            </Button>
        </Card>
    );
};
