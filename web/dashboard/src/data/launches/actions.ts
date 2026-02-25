'use server';

import { ActionError, ActionResponse } from '@/data/action';
import { actionError, actionSuccess } from '@/data/utils';
import {
  getEnvironmentsById,
  upsertComponentConfig,
} from '@/data/projects/actions';
import {
  EnvironmentWithComponents,
  ProjectComponentConfigInput,
} from '@/data/projects/dto';
import { projectComponentConfig } from '@/data/projects/schema';
import { db } from '@/db';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { components, componentVersions } from '@/data/components/schema';

const query = async (id: string) =>
  db
    .select()
    .from(projectComponentConfig)
    .where(eq(projectComponentConfig.id, id));

const latestQuery = async (id: string) =>
  db
    .select({
      ...getTableColumns(projectComponentConfig),
      component_version: sql`coalesce(${projectComponentConfig.component_version}, ${componentVersions.id})`,
    })
    .from(projectComponentConfig)
    .leftJoin(
      componentVersions,
      eq(componentVersions.component_id, projectComponentConfig.component_id),
    )
    .orderBy(
      sql`string_to_array(${componentVersions.version}, '.')::int[] DESC`,
    )
    .where(eq(projectComponentConfig.id, id));

async function merge(
  from: EnvironmentWithComponents['components'],
  to: EnvironmentWithComponents,
) {
  const result: (ProjectComponentConfigInput & { event: string })[] = [];
  let event: string | undefined = undefined;

  for (const compFrom of from) {
    const compTo = to.components.find((c) => c.id === compFrom.id);
    if (compTo?.is_active !== compFrom.is_active) {
      event = 'project_component_activated';
    }
    if (compTo?.version !== compFrom.version) {
      event = 'project_component_version_updated';
    }

    if (event) {
      let configFrom;
      if (to.secure) {
        configFrom = (await latestQuery(compFrom.config_id))[0];
      } else {
        configFrom = (await query(compFrom.config_id))[0];
      }

      if (compTo) {
        const configTo = (await query(compTo.config_id))[0];
        result.push({
          ...configTo,
          component_version: configFrom.component_version,
          is_active: configTo.is_active,
          event,
        });
      } else {
        result.push({
          ...configFrom,
          id: undefined,
          environment_id: to.id,
          event,
        });
      }
    }
  }

  return result;
}

export async function launch(
  fromId: string,
  toId: string,
  userId?: string,
): ActionResponse<{ errors: ActionError[] }> {
  if (!userId) {
    return actionError('No user provided.');
  }
  const errors: ActionError[] = [];

  try {
    const from = await getEnvironmentsById(fromId, userId);
    const to = await getEnvironmentsById(toId, userId);

    if (!from.success || !to.success) {
      return actionError('Failed to fetch environments to compare.');
    }

    const fromComponents = from.data.components;
    const mergeResult = await merge(fromComponents, to.data);

    for (const config of mergeResult) {
      const upsert = await upsertComponentConfig(
        config,
        to.data.project_id,
        userId,
        config.event,
      );

      if (!upsert.success) {
        errors.push(upsert.error);
      }
    }

    return actionSuccess({ errors: errors });
  } catch (error) {
    return actionError('Failed to insert user into database.');
  }
}
