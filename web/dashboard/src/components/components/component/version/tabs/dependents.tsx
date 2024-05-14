import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {MoreHorizontalIcon} from "lucide-react";
import {HomeIcon, PersonIcon} from "@radix-ui/react-icons";
import {ProjectWithOwners} from "@/data/projects/dto";
import Link from "next/link";


interface PreviewProps {
    dependents: ProjectWithOwners[];
}

const Dependents: React.FC<PreviewProps> = ({dependents = []}) => {

    return (
        <div className="grid gap-6">
            {dependents.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <HomeIcon className="w-8 h-8"/>
                            <div className="grid gap-1">
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>{project.description}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="ml-auto" size="icon" variant="ghost">
                                        <MoreHorizontalIcon className="w-4 h-4"/>
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>View Project</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <div className="text-sm font-semibold">Project Maintainers:</div>
                                <div className="items-center gap-4 text-sm">
                                    {project.owners.map((owner, index) => (
                                        <div key={index} className="flex items-center gap-1">
                                            <PersonIcon className="w-4 h-4"/>
                                            <span className="text-gray-500 dark:text-gray-400">{owner}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
};

export default Dependents;
