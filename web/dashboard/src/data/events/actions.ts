'use server';
import { z } from 'zod';
import { db } from '@/db';
import {
  eventsSchema,
  EventWithDiscriminatedUnions,
  eventWithDiscriminatedUnions,
  NewEvent,
} from '@/data/events/dto';
import { events, eventsTypeEnum } from '@/data/events/schema';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { eq, sql } from 'drizzle-orm';
import { users } from '@/data/users/schema';
import { components, componentVersions } from '@/data/components/schema';
import { ActionResponse } from '@/data/action';
import { projects } from '@/data/projects/schema';
import { alias } from 'drizzle-orm/pg-core';


export const insertEvent = async (event: NewEvent) => {
  try {
    const eventInserted = await db.insert(events).values(event).returning();
    const eventInsertedParsed = eventsSchema.safeParse(eventInserted[0]);
    console.debug('Event inserted into database.', eventInsertedParsed);
  } catch (error) {
    console.error('Failed to insert event into database.', error);
  }
};

export async function getResourceEvents(
  resourceId: string,
  limit = 50,
): ActionResponse<EventWithDiscriminatedUnions[]> {

  if (!resourceId) {
    return actionError('No resource id provided.');
  }

  try {
    const members = alias(users, 'members');
    const select = await db
      .select({
        ...events,
        user: users,
        data: {
          version: componentVersions,
          project: projects,
          component: components,
          member: members,
          permissions:  sql`(${events.data}->>'permissions')::text`,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.user_id, users.id))
      .leftJoin(projects, sql`(${events.data}->>'project_id')
                              ::uuid  =
                              ${projects.id}`)
      .leftJoin(componentVersions, sql`(${events.data}->>'version_id')::uuid =  ${componentVersions.id}`)
      .leftJoin(components, sql`(${events.data}->>'component_id')::uuid = ${components.id}`)
      .leftJoin(members, sql`(${events.data}->>'member_id')::uuid = ${members.id}`)
      .limit(limit)
      .where(eq(events.resource_id, resourceId));

    const modifiedSelect = select.map(event => {
      if (event.data?.version?.id === null) {
        delete event.data.version; // Remove version if it's null
      }
      if (event.data?.project?.id === null) {
        delete event.data.project; // Remove project if it's null
      }
      if (event.data?.component?.id === null) {
        delete event.data.component; // Remove component if it's null
      }
      if (event.data?.member?.id === null) {
        delete event.data.member; // Remove member if it's null
      }
      return event;
    });

    const safe = z.array(eventWithDiscriminatedUnions).safeParse(modifiedSelect);

    if (!safe.success) {
      console.error(safe.error);
      return actionZodError(
        'There\'s an issue with the events records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch events from database.');
  }
}
