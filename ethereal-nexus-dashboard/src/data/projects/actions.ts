'use server';

import { Result } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { projectSchema, projectWithComponentSchema } from './dto';
import * as console from 'console';
import { and, eq, inArray } from 'drizzle-orm';
import { members } from '@/data/member/schema';
import { projects } from '@/data/projects/schema';

const userIsMember = (userId: string) => inArray(
  projects.id,
  db.select({ id: members.resource })
    .from(members)
    .where(
      eq(members.user_id, userId)
    )
);

export async function getProjects(userId: string | undefined | null): Promise<Result<z.infer<typeof projectWithComponentSchema>[]>> {
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
          members: true
        }
      });


    console.log(select);

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

export async function deleteProject(id: string, userId: string | undefined | null): Promise<Result<z.infer<typeof projectSchema>[]>> {
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