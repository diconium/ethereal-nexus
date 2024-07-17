import {insertEvent} from "@/data/events/actions";
import { NewEvent } from '@/data/events/dto';

export const logEvent = async (newEvent:NewEvent) => {
    console.debug('Logging event', newEvent);
    await insertEvent(newEvent);

};
