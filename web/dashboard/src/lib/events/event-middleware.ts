import {EventType} from "@/lib/events/Event";
import {insertEvent} from "@/data/events/actions";

interface LogEventParams {
    type: EventType;
    userId: string
    resourceId: string;
    data?: any;
}

export const logEvent = async ({ type, userId, data, resourceId }: LogEventParams) => {

    const timestamp = new Date();

    console.debug('Logging event', {type, userId, timestamp, data,resourceId});

    // Insert a new event
    const newEvent = {
        type,
        "user_id": userId,
        resource_id: resourceId, // use the id of the newly created resource
        timestamp,
        data,
    };
    await insertEvent(newEvent);

};
