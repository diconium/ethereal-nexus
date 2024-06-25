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
import Empty from '@/components/components/table/empty';

interface EventProps {
    events: EventWithUsername[];
}

const Events: React.FC<EventProps> = ({events=[]}) => {



    return (
        <div className="w-full max-w-8xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">

                <div className="space-y-4">
                    {events.length === 0 && (<Empty itemsName={'events'}></Empty>)}
                    {events.map((event, index) => (
                        <EventComponent event={event} key={index}/>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Events;
