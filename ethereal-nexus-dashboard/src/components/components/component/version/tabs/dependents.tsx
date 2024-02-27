"use client"

import React from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {MoreHorizontalIcon} from "lucide-react";
import {HomeIcon, PersonIcon} from "@radix-ui/react-icons";


interface PreviewProps {
}

const Dependents: React.FC<PreviewProps> = () => {

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <HomeIcon className="w-8 h-8" />
                    <div className="grid gap-1">
                        <CardTitle>Corporate</CardTitle>
                        <CardDescription>corporate.example.com</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="ml-auto" size="icon" variant="ghost">
                                <MoreHorizontalIcon className="w-4 h-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Project</DropdownMenuItem>
                            <DropdownMenuItem>View Settings</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2">
                        <div className="text-sm font-semibold">Project Maintainers:</div>
                        <div className="items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <PersonIcon className="w-4 h-4" />
                                <span className="text-gray-500 dark:text-gray-400">Rui Silva</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <PersonIcon className="w-4 h-4" />
                                <span className="text-gray-500 dark:text-gray-400">Francisco Madeira</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dependents;
