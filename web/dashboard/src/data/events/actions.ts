'use server'
import {z} from "zod";
import {db} from '@/db';
import {
    eventsSchema,
    EventWithDiscriminatedUnions,
    eventWithDiscriminatedUnions,
    eventWithUserAndVersionSchema,
    NewEvent
} from "@/data/events/dto";
import {events} from "@/data/events/schema";
import {actionError, actionSuccess, actionZodError} from "@/data/utils";
import {eq, sql} from "drizzle-orm";
import {users} from "@/data/users/schema";
import {componentVersions} from "@/data/components/schema";
import {ActionResponse} from "@/data/action";
import {ProjectWithOwners} from "@/data/projects/dto";
import {projects} from "@/data/projects/schema";


export const insertEvent = async (event: NewEvent) => {
    try {
        const eventInserted = await db.insert(events).values(event).returning();
        const eventInsertedParsed = eventsSchema.safeParse(eventInserted[0]);
        console.debug('Event inserted into database.', eventInsertedParsed);
    } catch (error) {
        console.error('Failed to insert event into database.', error);
    }
}
export async function getComponentEvents(
    componentId: string,
): ActionResponse<EventWithDiscriminatedUnions[]> {
    try {
        const select = await db
            .select({...events, data:{username:users.name, version: componentVersions.version, project: projects.name}})
            .from(events)
            .leftJoin(users, eq(events.user_id,users.id))
            .leftJoin(componentVersions, sql`(${events.data}->>'version_id')::uuid  = ${componentVersions.id}`)
            .leftJoin(projects, sql`(${events.data}->>'project_id')::uuid  = ${projects.id}`)
            .where(
                sql`${events.data}->>'component_id' = ${componentId}`
            );
console.log(select)
        const safe = z.array(eventWithDiscriminatedUnions).safeParse(select);
        if (!safe.success) {
            console.error(safe.error);
            return actionZodError(
                "There's an issue with the project records.",
                safe.error,
            );
        }

        return actionSuccess(safe.data);
    } catch (error) {
        console.error(error);
        return actionError('Failed to fetch project from database.');
    }
}
