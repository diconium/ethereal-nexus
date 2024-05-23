import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@radix-ui/react-dropdown-menu";
import {Button} from "@/components/ui/button";
import {BugIcon, CloudIcon, FilterIcon, PackageIcon, RefreshCwIcon} from "lucide-react";
import {CalendarIcon, CodeIcon} from "@radix-ui/react-icons";
import {Card, CardContent} from "@/components/ui/card";
import Link from "next/link";
import EventComponent from "@/components/components/events/event";
import {EventWithUsername} from "@/data/events/dto";

interface EventProps {
    events: EventWithUsername[];
}

const Events: React.FC<EventProps> = ({events=[]}) => {



    return (
        <div className="w-full max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Platform Activity</h2>
                    <div className="flex items-center space-x-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                    <FilterIcon className="w-5 h-5"/>
                                    <span className="sr-only">Filter</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem>
                                    <CalendarIcon className="w-4 h-4 mr-2"/>
                                    Last 7 days
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <CalendarIcon className="w-4 h-4 mr-2"/>
                                    Last 30 days
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <CalendarIcon className="w-4 h-4 mr-2"/>
                                    Last 90 days
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem>
                                    <FilterIcon className="w-4 h-4 mr-2"/>
                                    Filter by type
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="icon" variant="ghost">
                            <RefreshCwIcon className="w-5 h-5"/>
                            <span className="sr-only">Refresh</span>
                        </Button>
                    </div>
                </div>
                <div className="space-y-4">
                    {events.map((event, index) => (
                        <EventComponent event={event} key={index}/>
                    ))}

                    {/*<Card className="rounded-lg shadow-md">*/}
                    {/*    <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">*/}
                    {/*        <BugIcon className="w-8 h-8 text-primary"/>*/}
                    {/*        <div className="space-y-1">*/}
                    {/*            <p className="font-medium">Bug fixed</p>*/}
                    {/*            <p className="text-sm text-gray-500 dark:text-gray-400">*/}
                    {/*                <Link className="font-medium" href="#">*/}
                    {/*                    Amelia Flores*/}
                    {/*                </Link>*/}
                    {/*                fixed a critical bug in the login flow that was causing users to experience*/}
                    {/*                issues when trying to*/}
                    {/*                access the platform.*/}
                    {/*            </p>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-sm text-gray-500 dark:text-gray-400">3 days ago</p>*/}
                    {/*    </CardContent>*/}
                    {/*</Card>*/}
                    {/*<Card className="rounded-lg shadow-md">*/}
                    {/*    <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">*/}
                    {/*        <PackageIcon className="w-8 h-8 text-primary"/>*/}
                    {/*        <div className="space-y-1">*/}
                    {/*            <p className="font-medium">Dependency updated</p>*/}
                    {/*            <p className="text-sm text-gray-500 dark:text-gray-400">*/}
                    {/*                <Link className="font-medium" href="#">*/}
                    {/*                    Max Leiter*/}
                    {/*                </Link>*/}
                    {/*                updated the React dependency to the latest version, which includes several*/}
                    {/*                bug fixes and performance*/}
                    {/*                improvements.*/}
                    {/*            </p>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-sm text-gray-500 dark:text-gray-400">1 week ago</p>*/}
                    {/*    </CardContent>*/}
                    {/*</Card>*/}
                    {/*<Card className="rounded-lg shadow-md">*/}
                    {/*    <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">*/}
                    {/*        <CloudIcon className="w-8 h-8 text-primary"/>*/}
                    {/*        <div className="space-y-1">*/}
                    {/*            <p className="font-medium">Deployment completed</p>*/}
                    {/*            <p className="text-sm text-gray-500 dark:text-gray-400">*/}
                    {/*                <Link className="font-medium" href="#">*/}
                    {/*                    Shu Ding*/}
                    {/*                </Link>*/}
                    {/*                successfully deployed the latest version of the app, which includes several*/}
                    {/*                new features and bug*/}
                    {/*                fixes.*/}
                    {/*            </p>*/}
                    {/*        </div>*/}
                    {/*        <p className="text-sm text-gray-500 dark:text-gray-400">2 weeks ago</p>*/}
                    {/*    </CardContent>*/}
                    {/*</Card>*/}
                </div>
            </div>
        </div>
    );
};

export default Events;
