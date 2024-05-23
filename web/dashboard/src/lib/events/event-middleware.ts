import {EventType} from "@/lib/events/Event";
import {insertEvent} from "@/data/events/actions"; // replace with your actual db import

export const logEvent = (type: EventType, userId: string, data: any) => {


    const timestamp = new Date();

    console.debug('Logging event', {type, userId, timestamp, data});

    insertEvent({type, "user_id": userId, timestamp, data});
};
