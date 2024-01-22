'use server';

import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { users } from '@/data/users/schema';
import {
  newUserSchema,
  userEmailSchema,
  userPublicSchema,
  userSchema,
} from '@/data/users/dto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ActionResponse, Result } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';

export async function insertUser(
  user: z.infer<typeof newUserSchema>,
): ActionResponse<z.infer<typeof userPublicSchema>> {
  const safeUser = newUserSchema.safeParse(user);
  if (!safeUser.success) {
    return actionZodError('Failed to parse user input.', safeUser.error);
  }

  const { email, password } = safeUser.data;

  console.log(email, password);

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existingUser.length > 0) {
    return actionError('User with that email already exists.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password!, 10);
    const insert = await db
      .insert(users)
      .values({
        ...safeUser.data,
        id: randomUUID(),
        password: hashedPassword,
      })
      .returning();

    const result = userPublicSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError(
        'Failed to parse user inserted user.',
        result.error,
      );
    }

    return actionSuccess(result.data);
  } catch (error) {
    return actionError('Failed to insert user onto database.');
  }
}

export async function getUserByEmail(unsafeEmail: string): ActionResponse<z.infer<typeof userSchema>> {
  const safeEmail = userEmailSchema.safeParse({email: unsafeEmail})
  if(!safeEmail.success){
    return actionZodError('The email input is not valid.', safeEmail.error);
  }

  const email = safeEmail.data.email;

  try {
    const userSelect = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    const safeUser = userSchema.safeParse(userSelect[0]);
    if (!safeUser.success) {
      return actionZodError(
        "There's an issue with the user record.",
        safeUser.error,
      );
    }

    return actionSuccess(safeUser.data);
  } catch {
    return actionError('Failed to fetch user from database.');
  }
}

export async function getUsers(): ActionResponse<z.infer<typeof userPublicSchema>[]> {
  try {
    const userSelect = await db
      .select()
      .from(users)

    const safeUsers = z.array(userPublicSchema).safeParse(userSelect);
    if (!safeUsers.success) {
      return actionZodError( 'There\'s an issue with the user records.', safeUsers.error);
    }

    return actionSuccess(safeUsers.data)
  } catch  {
    return actionError( 'Failed to fetch users from database.')
  }
}