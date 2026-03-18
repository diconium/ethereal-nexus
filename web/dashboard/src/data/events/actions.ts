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
import { eq, sql, and, desc, inArray } from 'drizzle-orm';
import { users } from '@/data/users/schema';
import { components, componentVersions } from '@/data/components/schema';
import { ActionResponse } from '@/data/action';
import { projects } from '@/data/projects/schema';
import { alias } from 'drizzle-orm/pg-core';
import { logger } from '@/lib/logger';
import { members as memberTable } from '@/data/member/schema';

const parseCommaSeparatedValues = (value?: string | null) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
};

const appendUuidFilter = ({
  rawValue,
  label,
  addSingle,
  addMultiple,
}: {
  rawValue?: string | null;
  label: string;
  addSingle: (value: string) => void;
  addMultiple: (values: string[]) => void;
}) => {
  const uuidSchema = z.string().uuid();
  const parsedValues = parseCommaSeparatedValues(rawValue);
  const validValues: string[] = [];

  parsedValues.forEach((value) => {
    const result = uuidSchema.safeParse(value);
    if (result.success) {
      validValues.push(value);
      return;
    }

    logger.warn(`Ignoring invalid ${label} filter entry`, {
      operation: 'query-resource-events',
      [`invalid${label[0].toUpperCase()}${label.slice(1)}`]: value,
    });
  });

  if (validValues.length === 1) {
    addSingle(validValues[0]);
  } else if (validValues.length > 1) {
    addMultiple(validValues);
  }
};

const appendTextEnumFilter = ({
  rawValue,
  label,
  allowedValues,
  addSingle,
  addMultiple,
}: {
  rawValue?: string | null;
  label: string;
  allowedValues: readonly string[];
  addSingle: (value: string) => void;
  addMultiple: (values: string[]) => void;
}) => {
  const parsedValues = parseCommaSeparatedValues(rawValue);
  const validValues = parsedValues.filter((value) =>
    allowedValues.includes(value),
  );

  parsedValues
    .filter((value) => !allowedValues.includes(value))
    .forEach((value) => {
      logger.warn(`Ignoring invalid ${label} filter entry`, {
        operation: 'query-resource-events',
        [`invalid${label[0].toUpperCase()}${label.slice(1)}`]: value,
      });
    });

  if (validValues.length === 1) {
    addSingle(validValues[0]);
  } else if (validValues.length > 1) {
    addMultiple(validValues);
  }
};

const buildTextInClause = (columnExpression: any, values: string[]) =>
  sql`${columnExpression} in (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;

const MAX_EVENTS_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = new Set([
  'timestamp',
  'type',
  'user',
  'component',
  'project',
]);

const normalizePaginationNumber = (
  value: number | undefined,
  fallback: number,
  {
    min,
    max,
  }: {
    min: number;
    max: number;
  },
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  return Math.min(Math.max(normalized, min), max);
};

const isValidDateInput = (value?: string | null) =>
  !value || !Number.isNaN(Date.parse(value));

const buildComponentProjectVisibilityClause = (projectIds: string[]) => {
  const projectIdExpression = sql`(${events.data}->>'project_id')`;

  if (projectIds.length === 0) {
    return sql`${projectIdExpression} is null`;
  }

  return sql`(${projectIdExpression} is null or ${buildTextInClause(
    projectIdExpression,
    projectIds,
  )})`;
};

async function resolveEventAccessScope(
  resourceId: string,
  currentUserId: string,
): Promise<{
  isAdmin: boolean;
  resourceType: 'project' | 'component';
  accessibleProjectIds: string[];
} | null> {
  const [currentUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === 'admin';

  const [projectResource] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, resourceId))
    .limit(1);

  if (projectResource) {
    if (!isAdmin) {
      const [projectMembership] = await db
        .select({ resource: memberTable.resource })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.user_id, currentUserId),
            eq(memberTable.resource, projectResource.id),
          ),
        )
        .limit(1);

      if (!projectMembership) {
        return null;
      }
    }

    return {
      isAdmin,
      resourceType: 'project',
      accessibleProjectIds: [projectResource.id],
    };
  }

  const [componentResource] = await db
    .select({ id: components.id })
    .from(components)
    .where(eq(components.id, resourceId))
    .limit(1);

  if (!componentResource) {
    return null;
  }

  const componentProjects = await db
    .selectDistinct({
      projectId: sql<string | null>`${events.data}->>'project_id'`,
    })
    .from(events)
    .where(eq(events.resource_id, componentResource.id));

  const componentProjectIds = componentProjects
    .map((entry) => entry.projectId)
    .filter(Boolean);

  if (isAdmin) {
    return {
      isAdmin: true,
      resourceType: 'component',
      accessibleProjectIds: componentProjectIds,
    };
  }

  const memberProjects = await db
    .selectDistinct({ projectId: memberTable.resource })
    .from(memberTable)
    .where(eq(memberTable.user_id, currentUserId));

  const memberProjectIds = new Set(
    memberProjects.map((entry) => entry.projectId).filter(Boolean),
  );

  return {
    isAdmin: false,
    resourceType: 'component',
    accessibleProjectIds: componentProjectIds.filter((projectId) =>
      memberProjectIds.has(projectId),
    ),
  };
}

export const insertEvent = async (event: NewEvent) => {
  try {
    const eventInserted = await db.insert(events).values(event).returning();
    const eventInsertedParsed = eventsSchema.safeParse(eventInserted[0]);

    if (eventInsertedParsed.success) {
      logger.debug('Event successfully inserted into database', {
        operation: 'event-insert',
        eventId: eventInsertedParsed.data.id,
        eventType: eventInsertedParsed.data.type,
        resourceId: eventInsertedParsed.data.resource_id,
        userId: eventInsertedParsed.data.user_id,
      });
    } else {
      logger.warn('Event inserted but failed validation', {
        operation: 'event-insert',
        eventType: event.type,
        validationErrors: eventInsertedParsed.error?.errors,
      });
    }
  } catch (error) {
    logger.error('Failed to insert event into database', error as Error, {
      operation: 'event-insert',
      eventType: event.type,
      resourceId: event.resource_id,
      userId: event.user_id,
    });
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
          permissions: sql`(${events.data}->>'permissions')::text`,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.user_id, users.id))
      .leftJoin(
        projects,
        sql`(${events.data}->>'project_id')
                              ::uuid  =
                              ${projects.id}`,
      )
      .leftJoin(
        componentVersions,
        sql`(${events.data}->>'version_id')::uuid =  ${componentVersions.id}`,
      )
      .leftJoin(
        components,
        sql`(${events.data}->>'component_id')::uuid = ${components.id}`,
      )
      .leftJoin(
        members,
        sql`(${events.data}->>'member_id')::uuid = ${members.id}`,
      )
      .limit(limit)
      .where(eq(events.resource_id, resourceId));

    const modifiedSelect = select.map((event) => {
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

    const safe = z
      .array(eventWithDiscriminatedUnions)
      .safeParse(modifiedSelect);

    if (!safe.success) {
      logger.error(
        'Event records validation failed',
        new Error('Event validation error'),
        {
          operation: 'get-resource-events',
          resourceId,
          recordCount: modifiedSelect.length,
          validationErrors: safe.error.errors,
        },
      );
      return actionZodError(
        "There's an issue with the events records.",
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('Failed to fetch events from database', error as Error, {
      operation: 'get-resource-events',
      resourceId,
      limit,
    });
    return actionError('Failed to fetch events from database.');
  }
}

export async function queryResourceEvents(options: {
  resourceId: string;
  pageIndex?: number;
  pageSize?: number;
  userId?: string | null; // for filtering
  currentUserId: string; // for membership validation
  componentId?: string | null;
  projectId?: string | null;
  type?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortField?: string | null;
  sortDir?: 'asc' | 'desc' | null;
  globalFilter?: string | null;
}): Promise<
  ActionResponse<{
    data: EventWithDiscriminatedUnions[];
    total: number;
    filterOptions: {
      users: { id: string; name?: string; email?: string }[];
      components: { id: string; name?: string; title?: string }[];
      types: string[];
    };
  }>
> {
  const {
    resourceId,
    pageIndex = 0,
    pageSize = 20,
    userId,
    currentUserId,
    componentId,
    projectId,
    type,
    startDate,
    endDate,
    sortField,
    sortDir,
    globalFilter,
  } = options;

  const safePageIndex = normalizePaginationNumber(pageIndex, 0, {
    min: 0,
    max: 10_000,
  });
  const safePageSize = normalizePaginationNumber(pageSize, 20, {
    min: 1,
    max: MAX_EVENTS_PAGE_SIZE,
  });
  const safeSortField =
    sortField && ALLOWED_SORT_FIELDS.has(sortField) ? sortField : undefined;
  const safeSortDir = sortDir === 'asc' ? 'asc' : 'desc';

  try {
    if (!currentUserId) {
      return actionError('User ID is required for membership validation.');
    }

    if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
      return actionError('Invalid date filter provided');
    }

    const accessScope = await resolveEventAccessScope(
      resourceId,
      currentUserId,
    );
    if (!accessScope) {
      return actionError('User is not authorized to access this resource');
    }

    const accessWhereClauses: any[] = [eq(events.resource_id, resourceId)];
    if (!accessScope.isAdmin && accessScope.resourceType === 'component') {
      accessWhereClauses.push(
        buildComponentProjectVisibilityClause(accessScope.accessibleProjectIds),
      );
    }

    const whereClauses: any[] = [...accessWhereClauses];
    logger.debug('Filtering with userId:', { userId });

    appendUuidFilter({
      rawValue: userId,
      label: 'userId',
      addSingle: (value) => {
        whereClauses.push(eq(events.user_id, value));
      },
      addMultiple: (values) => {
        whereClauses.push(inArray(events.user_id, values));
      },
    });

    logger.debug('Current whereClauses count:', { count: whereClauses.length });

    appendTextEnumFilter({
      rawValue: type,
      label: 'type',
      allowedValues: eventsTypeEnum.enumValues,
      addSingle: (value) => {
        whereClauses.push(sql`${events.type}::text = ${value}`);
      },
      addMultiple: (values) => {
        whereClauses.push(buildTextInClause(sql`${events.type}::text`, values));
      },
    });
    if (projectId) {
      if (
        accessScope.resourceType === 'project' &&
        projectId !== accessScope.accessibleProjectIds[0]
      ) {
        return actionError('User is not authorized to access this project');
      }

      if (
        accessScope.resourceType === 'component' &&
        !accessScope.isAdmin &&
        !accessScope.accessibleProjectIds.includes(projectId)
      ) {
        return actionError('User is not authorized to access this project');
      }

      whereClauses.push(sql`(${events.data}->>'project_id') = ${projectId}`);
    }
    appendUuidFilter({
      rawValue: componentId,
      label: 'componentId',
      addSingle: (value) => {
        whereClauses.push(sql`(${events.data}->>'component_id') = ${value}`);
      },
      addMultiple: (values) => {
        whereClauses.push(
          buildTextInClause(sql`(${events.data}->>'component_id')`, values),
        );
      },
    });
    if (startDate) {
      const dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      const startIso = dayStart.toISOString();
      // inline ISO timestamp literal cast to timestamptz to avoid parameter serialization issues
      logger.debug('startIso for date filter', {
        startIso,
        type: typeof startIso,
      });
      whereClauses.push(
        sql`${events.timestamp} >= ${sql.raw(`'${startIso}'::timestamptz`)}`,
      );
    }
    if (endDate) {
      const dayEnd = new Date(endDate);
      dayEnd.setHours(23, 59, 59, 999);
      const endIso = dayEnd.toISOString();
      logger.debug('endIso for date filter', { endIso, type: typeof endIso });
      whereClauses.push(
        sql`${events.timestamp} <= ${sql.raw(`'${endIso}'::timestamptz`)}`,
      );
    }

    if (globalFilter) {
      const searchPattern = `%${globalFilter}%`;
      whereClauses.push(
        sql`
          (${events.type}::text ILIKE ${searchPattern}
          OR ${users.name} ILIKE ${searchPattern}
          OR ${users.email} ILIKE ${searchPattern}
          OR ${components.name} ILIKE ${searchPattern}
          OR ${components.title} ILIKE ${searchPattern}
          OR ${projects.name} ILIKE ${searchPattern})`,
      );
    }

    // base select with joins similar to getResourceEvents
    const members = alias(users, 'members');
    const base = db
      .select({
        ...events,
        user: users,
        data: {
          version: componentVersions,
          project: projects,
          component: components,
          member: members,
          permissions: sql`(${events.data}->>'permissions')::text`,
        },
      })
      .from(events)
      .leftJoin(users, eq(events.user_id, users.id))
      .leftJoin(
        projects,
        sql`(${events.data}->>'project_id')::uuid  = ${projects.id}`,
      )
      .leftJoin(
        componentVersions,
        sql`(${events.data}->>'version_id')::uuid =  ${componentVersions.id}`,
      )
      .leftJoin(
        components,
        sql`(${events.data}->>'component_id')::uuid = ${components.id}`,
      )
      .leftJoin(
        members,
        sql`(${events.data}->>'member_id')::uuid = ${members.id}`,
      );

    // total count - must include same joins as base query for globalFilter to work
    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(events)
      .leftJoin(users, eq(events.user_id, users.id))
      .leftJoin(
        projects,
        sql`(${events.data}->>'project_id')::uuid = ${projects.id}`,
      )
      .leftJoin(
        components,
        sql`(${events.data}->>'component_id')::uuid = ${components.id}`,
      )
      .where(and(...whereClauses));

    const [{ count: total }] = await countQuery;

    // ordering
    let orderArg: any = desc(events.timestamp);
    if (safeSortField) {
      const dir = safeSortDir;
      // map allowed sort fields to actual columns
      if (safeSortField === 'timestamp') {
        orderArg = dir === 'asc' ? events.timestamp : desc(events.timestamp);
      } else if (safeSortField === 'type') {
        // events.type is an enum column – use the column itself (desc/asc wrapper)
        orderArg = dir === 'asc' ? events.type : desc(events.type);
      } else if (safeSortField === 'user') {
        // sort by users.name
        orderArg = dir === 'asc' ? users.name : desc(users.name);
      } else if (safeSortField === 'component') {
        // sort by component name JSON join
        orderArg = dir === 'asc' ? components.name : desc(components.name);
      } else if (safeSortField === 'project') {
        orderArg = dir === 'asc' ? projects.name : desc(projects.name);
      }
    }

    const offset = safePageIndex * safePageSize;

    logger.debug('Final SQL query being executed for resource:', {
      resourceId,
    });
    // logger.debug('Final SQL query being executed:', { whereClauses }); // removed to avoid circular structure
    const select = await base
      .where(and(...whereClauses))
      .orderBy(orderArg)
      .limit(safePageSize)
      .offset(offset);

    const modifiedSelect = select.map((event) => {
      if (event.data?.version?.id === null) {
        delete event.data.version;
      }
      if (event.data?.project?.id === null) {
        delete event.data.project;
      }
      if (event.data?.component?.id === null) {
        delete event.data.component;
      }
      if (event.data?.member?.id === null) {
        delete event.data.member;
      }
      return event;
    });

    const safe = z
      .array(eventWithDiscriminatedUnions)
      .safeParse(modifiedSelect);
    if (!safe.success) {
      return actionZodError(
        "There's an issue with the events records.",
        safe.error,
      );
    }

    // Fetch all unique users for the resource
    const usersQuery = await db
      .selectDistinct({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(events)
      .leftJoin(users, eq(events.user_id, users.id))
      .where(and(...accessWhereClauses));

    // Fetch all unique components for the resource
    const componentsQuery = await db
      .selectDistinct({
        id: components.id,
        name: components.name,
        title: components.title,
      })
      .from(events)
      .leftJoin(
        components,
        sql`(${events.data}->>'component_id')::uuid = ${components.id}`,
      )
      .where(and(...accessWhereClauses));

    // Fetch all unique types for the resource
    const typesQuery = await db
      .selectDistinct({
        type: events.type,
      })
      .from(events)
      .where(and(...accessWhereClauses));

    const filterOptions = {
      users: usersQuery.filter((u) => u.id),
      components: componentsQuery.filter((c) => c.id),
      types: typesQuery.map((t) => t.type).filter(Boolean),
    };

    return actionSuccess({
      data: safe.data,
      total: Number(total) || 0,
      filterOptions,
    });
  } catch (error) {
    logger.error('Failed to query events', error as Error, {
      operation: 'query-resource-events',
    });
    return actionError('Failed to query events');
  }
}
