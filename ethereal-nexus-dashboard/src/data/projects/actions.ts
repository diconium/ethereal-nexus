import { z } from 'zod';
import { db } from '@/db';
import { newProjectSchema, projectsSchema } from '@/data/projects/dto';
import { Result } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { projects } from '@/data/projects/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function insertProject(
  project: z.infer<typeof newProjectSchema>,
): Promise<Result<z.infer<typeof projectsSchema>>> {
  const safeProject = newProjectSchema.safeParse(project);
  if (!safeProject.success) {
    return actionZodError('Failed to parse project´s input', safeProject.error);
  }

  const { name } = safeProject.data;

  const existingProject = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.name, name));
  if (existingProject.length > 0) {
    return actionError('Project with that name already exists.');
  }

  const insert = await db
    .insert(projects)
    .values({
      ...project,
      id: randomUUID(),
    })
    .returning();

  const result = projectsSchema.safeParse(insert[0]);
  if (!result.success) {
    return actionZodError('Failed to parse inserted project.', result.error);
  }

  return actionSuccess(result.data);
}

export async function selectAllProjects(): Promise<
  Result<z.infer<typeof projectsSchema>[]>
> {
  try {
    const projectsSelect = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projects);

    return actionSuccess(projectsSelect);
  } catch {
    return actionError('Failed to fetch projects from the database');
  }
}

export async function existsProjectById(id: string): Promise<Result<number>> {
  try {
    const projectsSelect = await db
      .select({
        count: sql<number>`cast(count(${projects.id}) as int)`,
      })
      .from(projects)
      .where(eq(projects.id, id));

    const count = projectsSelect.length ? projectsSelect[0].count : 0;

    if (!count) {
      return actionError(`Project ${id} does not exists`);
    }

    return actionSuccess(projectsSelect.length);
  } catch {
    return actionError(`Failed to fetch project ${id} from the database`);
  }
}

export async function selectProjectById(
  id: string,
): Promise<Result<z.infer<typeof projectsSchema>>> {
  try {
    const projectsSelect = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projects)
      .where(eq(projects.id, id));

    if (!projectsSelect?.length) {
      return actionError(`Project ${id} does not exists`);
    }

    const result = projectsSchema.safeParse(projectsSelect[0]);
    if (!result.success) {
      return actionZodError('Failed to parse selected project.', result.error);
    }

    return actionSuccess(result.data);
  } catch {
    return actionError(`Failed to fetch project ${id} from the database`);
  }
}

export async function selectComponentsByProject(id: number) {
  try {
  } catch {
    return actionError(
      `Failed to fetch project´s components from the database for project ${id}`,
    );
  }
}
