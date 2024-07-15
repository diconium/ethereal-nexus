'use server';

import { ActionResponse } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import {
  type Project,
  ProjectComponent,
  ProjectComponentConfig,
  ProjectComponentConfigInput,
  projectComponentConfigInputSchema,
  projectComponentConfigSchema,
  projectComponentsSchema,
  ProjectComponentsWithDialog,
  projectComponentsWithDialogSchema,
  ProjectInput,
  projectInputSchema,
  projectSchema,
  type ProjectWithComponent,
  projectWithComponentAssetsSchema,
  type ProjectWithComponentId,
  projectWithComponentIdSchema,
  projectWithComponentSchema,
} from './dto';
import * as console from 'console';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { projectComponentConfig, projects } from './schema';
import { insertMembers, userIsMember } from '@/data/member/actions';
import { componentAssets, components, componentVersions } from '@/data/components/schema';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Component, componentsSchema } from '@/data/components/dto';
import { logEvent } from '@/lib/events/event-middleware';
import { EventType } from '@/lib/events/Event';

export async function getProjects(
  userId: string | undefined | null,
): ActionResponse<ProjectWithComponentId[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.projects.findMany({
      where: userIsMember(userId),
      with: {
        components: {
          columns: {
            component_id: true,
          },
          where: (component, { eq }) => eq(component?.is_active, true),
        },
      },
    });

    const safe = z.array(projectWithComponentIdSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectsWithComponents(
  userId: string | undefined | null,
): ActionResponse<ProjectWithComponent[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.projects.findMany({
      where: userIsMember(userId),
      with: {
        components: {
          columns: {
            is_active: true,
            component_version: true,
          },
          with: {
            component: true,
            version: true,
          },
        },
      },
    });

    const safe = z.array(projectWithComponentSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectComponents(
  id: string | undefined | null,
  userId: string | undefined | null,
): ActionResponse<ProjectComponent[]> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  const versions = db.select().from(componentVersions).as('versions');
  try {
    const select = await db
      .select({
        ...getTableColumns(components),
        config_id: projectComponentConfig.id,
        is_active: projectComponentConfig.is_active,
        version: componentVersions.version,
        versions: sql`ARRAY_AGG
        (jsonb_build_object('id',
        ${versions.id},
        'version',
        ${versions.version}
        )
        )`,
      })
      .from(projectComponentConfig)
      .leftJoin(
        components,
        eq(components.id, projectComponentConfig.component_id),
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version),
      )
      .leftJoin(
        versions,
        eq(versions.component_id, components.id),
      )
      .groupBy(
        components.id,
        componentVersions.version,
        projectComponentConfig.id,
        projectComponentConfig.is_active,
      )
      .where(eq(projectComponentConfig.project_id, id))
      .orderBy(
        sql`${projectComponentConfig.is_active}
        DESC NULLS LAST`,
        sql`${componentVersions.version}
        NULLS LAST`,
        components.name,
      );

    const safe = projectComponentsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getComponentsNotInProject(
  id: string | undefined | null,
  userId: string | undefined | null,
): ActionResponse<Component[]> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db
      .select({
        ...getTableColumns(components),
      })
      .from(components)
      .leftJoin(
        projectComponentConfig,
        and(
          eq(components.id, projectComponentConfig.component_id),
          eq(projectComponentConfig.project_id, id),
          userIsMember(userId, projectComponentConfig.project_id),
        ),
      )
      .where(
        isNull(projectComponentConfig.id),
      )
      .orderBy(
        components.name,
      );

    const safe = componentsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getActiveProjectComponents(
  id: string | undefined | null,
  userId: string | undefined | null,
): ActionResponse<ProjectComponentsWithDialog[]> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  const latest_version = db.select()
    .from(componentVersions)
    .orderBy(desc(componentVersions.created_at))
    .groupBy(
      componentVersions.id,
      componentVersions.version,
      componentVersions.component_id,
      componentVersions.created_at,
      componentVersions.component_id,
    )
    .limit(1)
    .as('latest_version');

  try {
    const select = await db
      .select({
        ...getTableColumns(components),
        is_active: projectComponentConfig.is_active,
        version: sql`coalesce(
        ${componentVersions.version},
        ${latest_version.version}
        )`,
        dialog: sql`coalesce(
        ${componentVersions.dialog},
        ${latest_version.dialog}
        )`,
      })
      .from(components)
      .leftJoin(
        projectComponentConfig,
        eq(components.id, projectComponentConfig.component_id),
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version),
      )
      .leftJoin(latest_version, eq(latest_version.component_id, projectComponentConfig.component_id))
      .where(and(eq(projectComponentConfig.is_active, true), eq(projectComponentConfig.project_id, id)));

    const safe = projectComponentsWithDialogSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectComponentConfig(
  id: string | undefined | null,
  name: string | undefined | null,
  userId: string | undefined | null,
): ActionResponse<z.infer<typeof projectWithComponentAssetsSchema>> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!name) {
    return actionError('No component name provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  const assets = sql`
      ARRAY_AGG
      (
      jsonb_build_object(
        'id',
      ${componentAssets.id},
      'url',
      ${componentAssets.url},
      'type',
      ${componentAssets.type}
      )
      )
  `;
  const latest_version = db.select()
    .from(componentVersions)
    .as('latest_version');

  try {
    const result = await db
      .select({
        id: components.id,
        name: components.name,
        title: components.title,
        version: sql`coalesce(
        ${componentVersions.version},
        ${latest_version.version}
        )`,
        dialog: sql`coalesce(
        ${componentVersions.dialog}
        :
        :
        jsonb,
        ${latest_version.dialog}
        :
        :
        jsonb
        )`,
        assets,
      })
      .from(projectComponentConfig)
      .leftJoin(components, eq(components.id, projectComponentConfig.component_id))
      .leftJoin(componentVersions, eq(componentVersions.id, projectComponentConfig.component_version))
      .fullJoin(latest_version, eq(latest_version.component_id, projectComponentConfig.component_id))
      .leftJoin(componentAssets, sql`coalesce(
      ${componentVersions.id},
      ${latest_version.id}
      )
      =
      ${componentAssets.version_id}`)
      .where(and(
        eq(projectComponentConfig.project_id, id),
        eq(projectComponentConfig.is_active, true),
        eq(components.slug, name),
      ))
      .orderBy(sql`string_to_array
      (
      ${latest_version.version},
      '.'
      )
      :
      :
      int
      [
      ]
      DESC`)
      .limit(1)
      .groupBy(
        projectComponentConfig.project_id,
        components.id,
        components.name,
        componentVersions.version,
        sql`${componentVersions.dialog}
        ::jsonb`,
        sql`${latest_version.dialog}
        ::jsonb`,
        latest_version.version,
        latest_version.id,
      );

    const safe =
      projectWithComponentAssetsSchema.safeParse(result[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectComponentConfigWithVersion(
  id: string | undefined | null,
  userId: string | undefined | null,
): ActionResponse<z.infer<typeof projectWithComponentAssetsSchema>> {

  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  const assets = sql`
      ARRAY_AGG
      (
      jsonb_build_object(
        'id',
      ${componentAssets.id},
      'url',
      ${componentAssets.url},
      'type',
      ${componentAssets.type}
      )
      )
  `;
  const latest_version = db.select()
    .from(componentVersions)
    .as('latest_version');

  try {
    const result = await db
      .select({
        id: components.id,
        name: components.name,
        title: components.title,
        version: sql`coalesce(
        ${componentVersions.version},
        ${latest_version.version}
        )`,
        dialog: sql`coalesce(
        ${componentVersions.dialog}
        :
        :
        jsonb,
        ${latest_version.dialog}
        :
        :
        jsonb
        )`,
        assets,
      })
      .from(projectComponentConfig)
      .leftJoin(components, eq(components.id, projectComponentConfig.component_id))
      .leftJoin(componentVersions, eq(componentVersions.id, projectComponentConfig.component_version))
      .fullJoin(latest_version, eq(latest_version.component_id, projectComponentConfig.component_id))
      .leftJoin(componentAssets, sql`coalesce(
      ${componentVersions.id},
      ${latest_version.id}
      )
      =
      ${componentAssets.version_id}`)
      .where(and(
        // eq(projectComponentConfig.project_id, id),
        eq(projectComponentConfig.is_active, true),
      ))
      // .orderBy(sql`string_to_array(${latest_version.version}, '.')::int[] DESC`)
      // .limit(1)
      .groupBy(
        projectComponentConfig.project_id,
        components.id,
        componentVersions.version,
        sql`${componentVersions.dialog}
        ::jsonb`,
        sql`${latest_version.dialog}
        ::jsonb`,
        latest_version.version,
        latest_version.id,
      );

    const safe =
      projectWithComponentAssetsSchema.safeParse(result[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function deleteProject(
  id: string,
  userId: string | undefined | null,
): ActionResponse<Project[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(projects)
      .where(and(userIsMember(userId), eq(projects.id, id)))
      .returning();

    const safe = z.array(projectSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete project from database.');
  }
}

export async function getProjectById(
  id: string,
  userId: string | undefined | null,
): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }

  if (!id) {
    return actionError('No identifier provided.');
  }

  try {
    const select = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), userIsMember(userId)),
    });

    const safe = projectSchema.safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function upsertProject(
  project: ProjectInput,
  userId: string | undefined | null,
): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }
  const safeProject = projectInputSchema.safeParse(project);
  if (!safeProject.success) {
    return actionZodError('Failed to parse project´s input', safeProject.error);
  }

  const isUpdate = !!project.id
  try {
    const insert = await db
      .insert(projects)
      .values(safeProject.data)
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: safeProject.data.name,
          description: safeProject.data.description,
        },
      })
      .returning();

    const result = projectSchema.safeParse(insert[0]);


    if (!result.success) {
      return actionZodError('Failed to parse inserted project.', result.error);
    }

    await logEvent({
      type: isUpdate? 'project_updated': 'project_created',
      userId: userId,
      data: { },
      resourceId: result.data.id,
    });

    if (!safeProject.data.id) {
      const insertMember = await insertMembers([
        {
          user_id: userId,
          resource: result.data.id,
          role: 'owner',
          permissions: 'write',
        },
      ],userId);
      if (!insertMember.success) {
        return actionError('Failed to create owner.');
      }
    }

    revalidatePath(`/projects`, 'page');
    return actionSuccess(result.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert project into database.');
  }
}

export async function upsertComponentConfig(
  componentConfig: ProjectComponentConfigInput,
  userId: string | undefined | null,
  eventType: EventType | null | undefined,
): ActionResponse<ProjectComponentConfig> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeInput =
    projectComponentConfigInputSchema.safeParse(componentConfig);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse project´s component input',
      safeInput.error,
    );
  }

  try {
    const insert = await db
      .insert(projectComponentConfig)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [
          projectComponentConfig.component_id,
          projectComponentConfig.project_id,
        ],
        set: {
          is_active: safeInput.data.is_active,
          component_version: safeInput.data.component_version,
        },
      })
      .returning();

    const safe = projectComponentConfigSchema.safeParse(insert[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component config records.',
        safe.error,
      );
    }
    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');

    const logData = {
      version_id: safe.data.component_version,
      component_id: safe.data.component_id,
      project_id: safe.data.project_id,
    };
    switch (eventType) {
      case 'project_component_added':
        await logEvent({
          type: 'project_component_added',
          data: logData,
          userId,
          resourceId: safeInput.data.project_id,
        });
        break;
      case 'project_component_activated':
        await logEvent({
          type: 'project_component_activated',
          data: logData,
          userId,
          resourceId: safeInput.data.project_id,
        });
        await logEvent({
          type: 'component_activated',
          data: logData,
          userId,
          resourceId: safeInput.data.component_id,
        });
        break;
      case 'project_component_deactivated':
        await logEvent({
          type: 'project_component_deactivated',
          data: logData,
          userId,
          resourceId: safeInput.data.project_id,
        });
        await logEvent({
          type: 'component_deactivated',
          userId,
          data: logData,
          resourceId: safeInput.data.component_id,
        });
        break;
      case 'project_component_version_updated':
        await logEvent({
          type: 'project_component_version_updated',
          data: logData,
          userId,
          resourceId: safeInput.data.project_id,
        });
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      'Failed to insert project component config into database.',
    );
  }
}

export async function deleteComponentConfig(
  id: string,
  userId: string | undefined | null,
): ActionResponse<ProjectComponentConfig[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(projectComponentConfig)
      .where(
        and(
          userIsMember(userId, projectComponentConfig.project_id),
          eq(projectComponentConfig.id, id),
        ),
      )
      .returning();

    const safe = z.array(projectComponentConfigSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the config records.',
        safe.error,
      );
    }

    await logEvent({
      type: 'project_component_removed',
      userId,
      data: { component_id: safe.data[0].component_id },
      resourceId: safe.data[0].project_id,
    });


    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete config from database.');
  }
}
