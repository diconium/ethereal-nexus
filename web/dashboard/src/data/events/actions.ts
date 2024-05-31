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
            .leftJoin(projects, sql`(${events.data}->>'project_id')::uuid  = ${projects.id}`)
          .leftJoin(componentVersions, sql`CASE
        WHEN (${events.data}->>'version_id') IS NOT NULL THEN (${events.data}->>'version_id')::uuid
          WHEN (${events.data}->>'component_version') IS NOT NULL THEN (${events.data}->>'component_version')::uuid
          ELSE NULL
          END = ${componentVersions.id}`)
          // .leftJoin(componentVersions, sql`(${events.data}->>'version_id')::uuid  = ${componentVersions.id}`)
            // .leftJoin(componentVersions, sql`(${events.data}->>'component_version')::uuid  = ${componentVersions.id}`)
            .where(
                sql`${events.data}->>'component_id' = ${componentId}`
            );

        // SELECT event.*, "user".name, component_version.*
        // FROM event
        // LEFT JOIN "user" ON event.user_id = "user".id
        // LEFT JOIN component_version ON
        // CASE
        // WHEN (event.data->>'version_id') IS NOT NULL THEN (event.data->>'version_id')::uuid
        // WHEN (event.data->>'component_version') IS NOT NULL THEN (event.data->>'component_version')::uuid
        // ELSE NULL
        // END = component_version.id
        // WHERE data->>'component_id' = '55219ec2-fde3-496a-9e7a-ee0b2c321531';


console.log("select",select)
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
