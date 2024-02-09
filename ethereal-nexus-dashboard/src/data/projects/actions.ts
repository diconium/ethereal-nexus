'use server';

import { ActionResponse } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import {
  projectInputSchema,
  projectComponentsSchema,
  projectSchema,
  projectWithComponentIdSchema,
  projectWithComponentSchema,
  type Project,
  type ProjectWithComponentId,
  type ProjectWithComponent,
  ProjectComponent,
  ProjectComponentConfig,
  ProjectComponentConfigInput,
  projectComponentConfigInputSchema, projectComponentConfigSchema
} from './dto';
import * as console from 'console';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { projects, projectComponentConfig } from './schema';
import { insertMembers, userIsMember } from '@/data/member/actions';
import { components, componentVersions } from '@/data/components/schema';

export async function getProjects(userId: string | undefined | null): ActionResponse<ProjectWithComponentId[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.projects
      .findMany({
        where: userIsMember(userId),
        with: {
          components: {
            columns: {
              component_id: true
            }
          },
        }
      });

    const safe = z.array(projectWithComponentIdSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the project records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectsWithComponents(userId: string | undefined | null): ActionResponse<ProjectWithComponent[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.projects
      .findMany({
        where: userIsMember(userId),
        with: {
          components: {
            columns: {
              is_active: true,
              component_version: true
            },
            with: {
              component: true,
              version: true,
            }
          },
        }
      });

    const safe = z.array(projectWithComponentSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the project records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function getProjectComponents(id: string | undefined | null, userId: string | undefined | null): ActionResponse<ProjectComponent[]> {
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
        is_active: projectComponentConfig.is_active,
        version: componentVersions.version
      })
      .from(components)
      .leftJoin(projectComponentConfig, eq(components.id, projectComponentConfig.component_id))
      .leftJoin(componentVersions, eq(componentVersions.id, projectComponentConfig.component_version))

    const safe = projectComponentsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the project records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function deleteProject(id: string, userId: string | undefined | null): ActionResponse<Project[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db.delete(projects)
      .where(
        and(
          userIsMember(userId),
          eq(projects.id, id)
        )
      )
      .returning();

    const safe = z.array(projectSchema).safeParse(deleted);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the project records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete project from database.');
  }
}

export async function getProjectById(id: string, userId: string | undefined | null): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }

  if (!id) {
    return actionError('No identifier provided.');
  }

  try {
    const select = await db.query.projects
      .findFirst({
        where: and(
          eq(projects.id, id),
          userIsMember(userId)
        )
      });

    const safe = projectSchema.safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the project records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch project from database.');
  }
}

export async function insertProject(project: z.infer<typeof projectInputSchema>, userId: string | undefined | null): ActionResponse<z.infer<typeof projectSchema>> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeProject = projectInputSchema.safeParse(project);
  if (!safeProject.success) {
    return actionZodError('Failed to parse project´s input', safeProject.error);
  }
  try {
    const insert = await db
      .insert(projects)
      .values(safeProject.data)
      .returning()

    const result = projectSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError('Failed to parse inserted project.', result.error);
    }

    const insertMember = await insertMembers([{user_id: userId, resource: result.data.id, role: 'owner', permissions: 'write'}])
    if(!insertMember.success){
      return actionError('Failed to create owner.');
    }

    return actionSuccess(result.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert project into database.');
  }
}

export async function addComponentToProject(componentConfig: ProjectComponentConfigInput, userId: string | undefined | null): ActionResponse<ProjectComponentConfig> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeInput = projectComponentConfigInputSchema.safeParse(componentConfig);
  if (!safeInput.success) {
    return actionZodError('Failed to parse project´s component input', safeInput.error);
  }

  try {
    const insert = await db
      .insert(projectComponentConfig)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [projectComponentConfig.component_id, projectComponentConfig.project_id],
        set: { is_active: safeInput.data.is_active }
      })
      .returning()

    const safe = projectComponentConfigSchema.safeParse(insert);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the component config records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert project component config into database.');
  }
}