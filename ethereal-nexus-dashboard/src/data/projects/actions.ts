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
  type Project,
  type ProjectWithComponentId
} from './dto';
import * as console from 'console';
import { and, eq } from 'drizzle-orm';
import { projects } from '@/data/projects/schema';
import { userIsMember } from '@/data/member/actions';

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

export async function getProjectComponents(id: string | undefined | null, userId: string | undefined | null): ActionResponse<z.infer<typeof projectComponentsSchema>> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.projects
      .findFirst({
        columns: {
          name: true
        },
        where: and(
          eq(projects.id, id),
          userIsMember(userId)
        ),
        with: {
          components: {
            columns: {},
            with: {
              component: true
            }
          }
        }
      });

    const safe = projectComponentsSchema.safeParse(select);
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

export async function insertProject(project: z.infer<typeof projectInputSchema>): ActionResponse<z.infer<typeof projectSchema>> {
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

    return actionSuccess(result.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert project from database.');
  }
}