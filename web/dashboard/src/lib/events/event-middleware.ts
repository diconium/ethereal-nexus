import {EventType} from "@/lib/events/Event";
import {insertEvent} from "@/data/events/actions";
import { insertResource } from '@/data/resources/actions';
import { Resource, resourceSchema } from '@/data/resources/dto';
import { ActionResponse, Result } from '@/data/action'; // replace with your actual db import

interface LogEventParams {
    type: EventType;
    userId: string;
    resourceType: string;
    resourceId: string;
    data?: any;
}

export const logEvent = async ({ type, userId, data, resourceType, resourceId }: LogEventParams) => {

    const timestamp = new Date();

    console.debug('Logging event', {type, userId, timestamp, data,resourceType,resourceId});

    const newResource = {
        type: resourceType,
        resource_id: resourceId,
    };

    const insertedResource = await insertResource(newResource);
if(insertedResource.success){
console.log("insertedResource",insertedResource)
    console.log(insertedResource.data.id)
    // Insert a new event
    const newEvent = {
        type,
        "user_id": userId,
        resource_type: resourceType,
        resource_id: insertedResource.data.id, // use the id of the newly created resource
        timestamp,
        data,
    };
    await insertEvent(newEvent);

    // insertEvent({type, "user_id": userId, resource_type: resourceType ,resource_id: resourceId,timestamp, data});
}

};
