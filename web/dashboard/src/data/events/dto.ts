import {createInsertSchema, createSelectSchema} from 'drizzle-zod';
import {string, z} from 'zod';
import {events} from "@/data/events/schema";

export const eventsSchema = createSelectSchema(events);
export type Event = z.infer<typeof eventsSchema>;

export const newEventSchema = createInsertSchema(events)
export type NewEvent = z.infer<typeof newEventSchema>


export const eventWithUserAndVersionSchema = eventsSchema.extend({
    name: z.string(),
    version: z.string()
});
export type EventWithUsername = z.infer<typeof eventWithUserAndVersionSchema>;

export const eventWithDiscriminatedUnions = eventsSchema.extend({
    data: z.object(
        {
            username: z.string().nullish(),
            version: z.string().nullish(),
            project: z.string().nullish()}
    )
});
export type EventWithDiscriminatedUnions = z.infer<typeof eventWithDiscriminatedUnions>;
