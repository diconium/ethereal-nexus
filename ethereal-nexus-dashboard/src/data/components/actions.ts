import { ActionResponse, Result } from '@/data/action';
import { z } from 'zod';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { db } from '@/db';
import { Component, componentsSchema, componentsWithVersions, NewComponent, newComponentsSchema } from './dto';
import { newUserSchema, userPublicSchema } from '@/data/users/dto';
import { users } from '@/data/users/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { components } from '@/data/components/schema';

export async function insertComponent(component: NewComponent): ActionResponse<Component> {
  const safe = newComponentsSchema.safeParse(component);
  if (!safe.success) {
    return actionZodError('Failed to parse component input.', safe.error);
  }

  try {
    const insert = await db
      .insert(components)
      .values(safe.data)
      .returning();

    const result = componentsSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError(
        'Failed to parse inserted component.',
        result.error
      );
    }

    return actionSuccess(result.data);
  } catch (error) {
    console.error(error)
    return actionError('Failed to insert component into database.');
  }
}
export async function getComponents(): ActionResponse<z.infer<typeof componentsWithVersions>[]> {
try {
    const select = await db.query.components
      .findMany({
        with: {
          versions: true
        }
      });

    const safe = componentsWithVersions.array().safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the components records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch components from database.');
  }
}
