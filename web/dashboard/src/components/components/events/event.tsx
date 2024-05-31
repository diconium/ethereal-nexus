import React from 'react';
import {BugIcon, CloudIcon, FilterIcon, PackageIcon, RefreshCwIcon, ToggleLeft, ToggleRight} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import Link from "next/link";
import {EventWithDiscriminatedUnions, EventWithUsername} from "@/data/events/dto";
import {CodeIcon} from "@radix-ui/react-icons";


interface EventProps {
    event: EventWithDiscriminatedUnions;
}


const Event: React.FC<EventProps> = ({event}) => {
    switch (event.type) {
        case 'component_deactivated':
            return (<Card className="rounded-lg shadow-md" key={event.id}>
                <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">
                    <ToggleLeft className="w-8 h-8 text-primary"/>
                    <div className="space-y-1">
                        <p className="font-medium">Component deactivated</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <Link className="font-medium mr-1" href="#">
                                {event.data.username}
                            </Link>
                             deactivated on
                            <Link className="font-medium ml-1" href="#">
                                {event.data.project}
                            </Link>
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.timestamp.toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </CardContent>
            </Card>)
        case 'component_activated':
            return (<Card className="rounded-lg shadow-md" key={event.id}>
                <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">
                    <ToggleRight className="w-8 h-8 text-primary"/>
                    <div className="space-y-1">
                        <p className="font-medium">Component activated</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <Link className="font-medium mr-1" href="#">
                                {event.data.username}
                            </Link>
                             activated on {event.data.version? `version: ${event.data.version}`:''}
                            <Link className="font-medium ml-1" href="#">
                                {event.data.project}
                            </Link>
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.timestamp.toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </CardContent>
            </Card>)
        case 'component_update':
            return (<Card className="rounded-lg shadow-md" key={event.id}>
                <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">
                    <PackageIcon className="w-8 h-8 text-primary"/>
                    <div className="space-y-1">
                        <p className="font-medium">Component updated</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <Link className="font-medium mr-1" href="#">
                                {event.data.username}
                            </Link>
                             updated version
                            <Link className="font-medium ml-1" href="#">
                                {event.data.version}
                            </Link>
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.timestamp.toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </CardContent>
            </Card>)
        default:
            return (<Card className="rounded-lg shadow-md" key={event.id}>
                <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">
                    <CodeIcon className="w-8 h-8 text-primary"/>
                    <div className="space-y-1">
                        <p className="font-medium">{JSON.stringify(event)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <Link className="font-medium" href="#">
                                Olivia Davis
                            </Link>
                            added a new feature to the dashboard that allows users to track their team's
                            progress on various
                            projects.
                            {JSON.stringify(event.data)}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.timestamp.toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</p>
                </CardContent>
            </Card>);
    }
};

export default Event;
