'use server';

import { ActionResponse } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import {
  Environment,
  EnvironmentInput,
  environmentInputSchema,
  environmentsSchema,
  EnvironmentWithComponents,
  environmentWithComponentsSchema,
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
  projectWithComponentAssetsSchema,
  type ProjectWithComponentId,
  projectWithComponentIdSchema
} from './dto';
import * as console from 'console';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { environments, projectComponentConfig, projects } from './schema';
import { insertMembers, userIsMember } from '@/data/member/actions';
import { componentAssets, components, componentVersions } from '@/data/components/schema';
import { revalidatePath } from 'next/cache';
import { Component, componentsSchema } from '@/data/components/dto';
import { logEvent } from '@/lib/events/event-middleware';

export async function getProjects(
  userId: string | undefined | null
): ActionResponse<ProjectWithComponentId[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db
      .select({
        ...getTableColumns(projects),
        environments: sql`ARRAY_AGG
            (jsonb_build_object('id', ${environments.id}, 'name', ${environments.name}))`,
        components: sql`COALESCE
        ( JSONB_AGG(
            DISTINCT jsonb_build_object(
            'component_id', ${projectComponentConfig.component_id}
            )
            ) FILTER (WHERE ${projectComponentConfig.is_active} = true), '[]')`
      })
      .from(projects)
      .leftJoin(
        environments,
        eq(projects.id, environments.project_id)
      )
      .leftJoin(
        projectComponentConfig,
        eq(environments.id, projectComponentConfig.environment_id)
      )
      .where(await userIsMember(userId))
      .groupBy(projects.id);

    const safe = z.array(projectWithComponentIdSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getEnvironmentsByProject(
  projectId: string,
  userId: string | undefined | null
): ActionResponse<Environment[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db
      .select()
      .from(environments)
      .where(
        and(
          eq(environments.project_id, projectId),
          await userIsMember(userId, environments.project_id)
        )
      );

    const safe = z.array(environmentsSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the environments records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch environments from database.');
  }
}

export async function getEnvironmentsById(
  id: string,
  userId: string | undefined | null
): ActionResponse<EnvironmentWithComponents> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db
      .select({
        ...getTableColumns(environments),
        components: sql`COALESCE( 
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', ${components.id},
              'name', ${components.name},
              'title', ${components.title},
              'config_id', ${projectComponentConfig.id},
              'is_active', ${projectComponentConfig.is_active},
              'version', ${componentVersions.version}
            )
          ) FILTER (WHERE ${components.id} IS NOT NULL),
          '[]'::jsonb
        )`
      })
      .from(environments)
      .leftJoin(
        projectComponentConfig,
        eq(projectComponentConfig.environment_id, environments.id)
      )
      .leftJoin(
        components,
        eq(components.id, projectComponentConfig.component_id)
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version)
      )
      .groupBy(
        environments.id
      )
      .where(
        and(
          eq(environments.id, id),
          await userIsMember(userId, environments.project_id)
        )
      )
    
    const safe = environmentWithComponentsSchema.safeParse(select[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the environments records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch environments from database.');
  }
}

export async function getEnvironmentComponents(
  id: string | undefined | null,
  userId: string | undefined | null
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
            (jsonb_build_object('id', ${versions.id}, 'version', ${versions.version}))`
      })
      .from(projectComponentConfig)
      .leftJoin(
        components,
        eq(components.id, projectComponentConfig.component_id)
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version)
      )
      .leftJoin(
        versions,
        eq(versions.component_id, components.id)
      )
      .groupBy(
        components.id,
        componentVersions.version,
        projectComponentConfig.id,
        projectComponentConfig.is_active
      )
      .where(eq(projectComponentConfig.environment_id, id))
      .orderBy(
        sql`${projectComponentConfig.is_active} DESC NULLS LAST`,
        components.name
      );

    const safe = projectComponentsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getComponentsNotInEnvironment(
  id: string | undefined | null,
  userId: string | undefined | null
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
        ...getTableColumns(components)
      })
      .from(components)
      .leftJoin(
        projectComponentConfig,
        and(
          eq(components.id, projectComponentConfig.component_id),
          eq(projectComponentConfig.environment_id, id)
        )
      )
      .leftJoin(
        environments,
        and(
          eq(projectComponentConfig.environment_id, environments.id),
          await userIsMember(userId, environments.project_id)
        )
      )
      .where(
        isNull(projectComponentConfig.id)
      )
      .orderBy(
        components.name
      );

    const safe = componentsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
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
  userId: string | undefined | null
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
      componentVersions.component_id
    )
    .limit(1)
    .as('latest_version');

  const first_environment = db.select()
    .from(environments)
    .limit(1)
    .as('first_environment');

  try {
    const select = await db
      .select({
        ...getTableColumns(components),
        is_active: projectComponentConfig.is_active,
        version: sql`coalesce
            (${componentVersions.version}, ${latest_version.version})`,
        dialog: sql`coalesce
            (${componentVersions.dialog}, ${latest_version.dialog})`
      })
      .from(components)
      .leftJoin(
        projectComponentConfig,
        eq(components.id, projectComponentConfig.component_id)
      )
      .leftJoin(
        first_environment,
        eq(first_environment.id, projectComponentConfig.environment_id)
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version)
      )
      .leftJoin(
        latest_version,
        eq(latest_version.component_id, projectComponentConfig.component_id)
      )
      .where(
        and(
          eq(projectComponentConfig.is_active, true),
          eq(first_environment.project_id, id)
        )
      );

    const safe = projectComponentsWithDialogSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getActiveEnvironmentComponents(
  id: string | undefined | null,
  userId: string | undefined | null
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
      componentVersions.component_id
    )
    .limit(1)
    .as('latest_version');

  try {
    const select = await db
      .select({
        ...getTableColumns(components),
        is_active: projectComponentConfig.is_active,
        version: sql`coalesce
            (${componentVersions.version}, ${latest_version.version})`,
        dialog: sql`coalesce
            (${componentVersions.dialog}, ${latest_version.dialog})`
      })
      .from(components)
      .leftJoin(
        projectComponentConfig,
        eq(components.id, projectComponentConfig.component_id)
      )
      .leftJoin(
        componentVersions,
        eq(componentVersions.id, projectComponentConfig.component_version)
      )
      .leftJoin(
        latest_version,
        eq(latest_version.component_id, projectComponentConfig.component_id)
      )
      .where(
        and(
          eq(projectComponentConfig.is_active, true),
          eq(projectComponentConfig.environment_id, id)
        )
      );

    const safe = projectComponentsWithDialogSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
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
  userId: string | undefined | null
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

  const latest_version = db.select()
    .from(componentVersions)
    .as('latest_version');

  const first_environment = db.select()
    .from(environments)
    .limit(1)
    .as('first_environment');

  try {
    const component = await db
      .select({
        id: components.id,
        name: components.name,
        title: components.title,
        version: sql`coalesce
            (${componentVersions.version}, ${latest_version.version})`,
        versionId: sql`coalesce
            (${componentVersions.id}, ${latest_version.id})`,
        dialog: sql`coalesce
            (${componentVersions.dialog}::jsonb, ${latest_version.dialog}::jsonb)`,
      })
      .from(projectComponentConfig)
      .leftJoin(components, eq(components.id, projectComponentConfig.component_id))
      .leftJoin(componentVersions, eq(componentVersions.id, projectComponentConfig.component_version))
      .fullJoin(latest_version, eq(latest_version.component_id, projectComponentConfig.component_id))
      .leftJoin(
        first_environment,
        eq(first_environment.id, projectComponentConfig.environment_id)
      )
      .where(and(
        eq(first_environment.project_id, id),
        eq(projectComponentConfig.is_active, true),
        eq(components.slug, name)
      ))
      .orderBy(sql`string_to_array
          (${latest_version.version}, '.')
          ::int[] DESC`)
      .limit(1)
      .groupBy(
        first_environment.project_id,
        components.id,
        components.name,
        componentVersions.id,
        componentVersions.version,
        sql`${componentVersions.dialog}::jsonb`,
        sql`${latest_version.dialog}::jsonb`,
        latest_version.version,
        latest_version.id
      );

    const result = component[0];

    result.assets = await db
      .select({
        id: componentAssets.id,
        type: componentAssets.type,
        filePath: componentAssets.url,
      })
      .from(componentAssets)
      .where(and(
        eq(componentAssets.version_id, result.versionId)
      ));

    return actionSuccess(result);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getEnvironmentComponentConfig(
  id: string | undefined | null,
  name: string | undefined | null,
  userId: string | undefined | null
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

  const latest_version = db.select()
    .from(componentVersions)
    .as('latest_version');

  try {
    const component = await db
      .select({
        id: components.id,
        name: components.name,
        title: components.title,
        versionId: sql`coalesce
            (${componentVersions.id}, ${latest_version.id})`,
        version: sql`coalesce
            (${componentVersions.version}, ${latest_version.version})`,
        dialog: sql`coalesce
            (${componentVersions.dialog}::jsonb, ${latest_version.dialog}::jsonb)`,
      })
      .from(projectComponentConfig)
      .leftJoin(components, eq(components.id, projectComponentConfig.component_id))
      .leftJoin(componentVersions, eq(componentVersions.id, projectComponentConfig.component_version))
      .fullJoin(latest_version, eq(latest_version.component_id, projectComponentConfig.component_id))
      .where(and(
        eq(projectComponentConfig.environment_id, id),
        eq(projectComponentConfig.is_active, true),
        eq(components.slug, name)
      ))
      .orderBy(sql`string_to_array
          (${latest_version.version}, '.')
          ::int[] DESC`)
      .limit(1)
      .groupBy(
        components.id,
        projectComponentConfig.id,
        projectComponentConfig.environment_id,
        projectComponentConfig.component_id,
        projectComponentConfig.component_version,
        componentVersions.id,
        componentVersions.component_id,
        componentVersions.version,
        latest_version.id,
        latest_version.component_id,
        latest_version.version,
        latest_version.dialog,
      );

    const result = component[0];

    result['assets'] = await db
      .select({
        id: componentAssets.id,
        type: componentAssets.type,
        filePath: componentAssets.url,
      })
      .from(componentAssets)
      .where(and(
        eq(componentAssets.version_id, result.versionId)
      ));

    return actionSuccess(result);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function deleteProject(
  id: string,
  userId: string | undefined | null
): ActionResponse<Project[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(projects)
      .where(and(await userIsMember(userId), eq(projects.id, id)))
      .returning();

    const safe = z.array(projectSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
      );
    }

    revalidatePath(`/projects`, 'page');
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete project from database.');
  }
}

export async function getProjectById(
  id: string,
  userId: string | undefined | null
): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }

  if (!id) {
    return actionError('No identifier provided.');
  }

  try {
    const select = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          await userIsMember(userId)
        )
      )
      .limit(1);

    const safe = projectSchema.safeParse(select[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the project records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function upsertComponentConfig(
  componentConfig: ProjectComponentConfigInput,
  projectId: string,
  userId: string | undefined | null,
  eventType: string
): ActionResponse<ProjectComponentConfig> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeInput =
    projectComponentConfigInputSchema.safeParse(componentConfig);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse project´s component input',
      safeInput.error
    );
  }

  try {
    const insert = await db
      .insert(projectComponentConfig)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [
          projectComponentConfig.component_id,
          projectComponentConfig.environment_id
        ],
        set: {
          is_active: safeInput.data.is_active,
          component_version: safeInput.data.component_version
        }
      })
      .returning();

    const safe = projectComponentConfigSchema.safeParse(insert[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component config records.',
        safe.error
      );
    }
    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');

    const logData = {
      version_id: safe.data.component_version,
      component_id: safe.data.component_id,
      project_id: projectId
    };
    switch (eventType) {
      case 'project_component_added':
        await logEvent({
          type: 'project_component_added',
          data: logData,
          user_id: userId,
          resource_id: projectId
        });
        break;
      case 'project_component_activated':
        await logEvent({
          type: 'project_component_activated',
          data: logData,
          user_id: userId,
          resource_id: projectId
        });
        await logEvent({
          type: 'component_activated',
          data: logData,
          user_id: userId,
          resource_id: safeInput.data.component_id
        });
        break;
      case 'project_component_deactivated':
        await logEvent({
          type: 'project_component_deactivated',
          data: logData,
          user_id: userId,
          resource_id: projectId
        });
        await logEvent({
          type: 'component_deactivated',
          user_id: userId,
          data: logData,
          resource_id: safeInput.data.component_id
        });
        break;
      case 'project_component_version_updated':
        await logEvent({
          type: 'project_component_version_updated',
          data: logData,
          user_id: userId,
          resource_id: projectId
        });
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      'Failed to insert project component config into database.'
    );
  }
}

export async function upsertProject(
  project: ProjectInput,
  userId: string | undefined | null
): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }
  const safeProject = projectInputSchema.safeParse(project);
  if (!safeProject.success) {
    return actionZodError('Failed to parse project´s input', safeProject.error);
  }
  const isUpdate = !!safeProject.data.id;

  try {
    const insert = await db
      .insert(projects)
      .values(safeProject.data)
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: safeProject.data.name,
          description: safeProject.data.description
        }
      })
      .returning();

    const result = projectSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError('Failed to parse inserted project.', result.error);
    }

    await logEvent({
      type: isUpdate ? 'project_updated' : 'project_created',
      user_id: userId,
      data: {},
      resource_id: result.data.id
    });

    if (!isUpdate) {
      const insertMember = await insertMembers([
        {
          user_id: userId,
          resource: result.data.id,
          role: 'owner',
          permissions: 'write'
        }
      ], userId);
      if (!insertMember.success) {
        return actionError('Failed to create owner.');
      }

      const environment = await upsertEnvironment({
        name: 'main',
        description: `Default environment for the project ${result.data.name}`,
        project_id: result.data.id,
        secure: false
      }, userId);
      if (!environment.success) {
        return actionError('Failed to create default environment.');
      }
    }

    revalidatePath(`/projects`, 'page');
    return actionSuccess(result.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert project into database.');
  }
}

export async function upsertEnvironment(
  environment: EnvironmentInput,
  userId: string | undefined | null
): ActionResponse<Environment> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeInput = environmentInputSchema.safeParse(environment);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse environment input',
      safeInput.error
    );
  }

  try {
    const insert = await db
      .insert(environments)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [
          environments.id
        ],
        set: {
          secure: safeInput.data.secure,
          description: safeInput.data.description
        }
      })
      .returning();

    const safe = environmentsSchema.safeParse(insert[0]);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the environment record.',
        safe.error
      );
    }
    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      'Failed to insert project component config into database.'
    );
  }
}

export async function deleteComponentConfig(
  id: string,
  projectId: string,
  userId: string | undefined | null
): ActionResponse<ProjectComponentConfig[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(projectComponentConfig)
      .where(
        eq(projectComponentConfig.id, id)
      )
      .returning();

    const safe = z.array(projectComponentConfigSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the config records.',
        safe.error
      );
    }

    await logEvent({
      type: 'project_component_removed',
      user_id: userId,
      data: { component_id: safe.data[0].component_id },
      resource_id: projectId
    });


    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete config from database.');
  }
}

export async function deleteEnvironment(
  id: string,
  userId: string | undefined | null
): ActionResponse<Environment[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(environments)
      .where(
        and(
          eq(environments.id, id),
          await userIsMember(userId, environments.project_id)
        )
      )
      .returning();

    const safe = z.array(environmentsSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the config records.',
        safe.error
      );
    }

    revalidatePath('/(layout)/(session)/projects/[id]', 'layout');
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete config from database.');
  }
}