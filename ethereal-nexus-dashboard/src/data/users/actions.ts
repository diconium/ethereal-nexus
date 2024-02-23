'use server';

import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { apiKeys, users } from '@/data/users/schema';
import {
  ApiKey,
  apiKeyPublicSchema,
  apiKeySchema,
  NewApiKey,
  newApiKeySchema,
  newUserSchema,
  PublicUser,
  userEmailSchema,
  userIdSchema,
  userPublicSchema,
  userSchema
} from '@/data/users/dto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { ActionResponse } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';

export async function insertUser(user: z.infer<typeof newUserSchema>): ActionResponse<z.infer<typeof userPublicSchema>> {
  const safeUser = newUserSchema.safeParse(user);
  if (!safeUser.success) {
    return actionZodError('Failed to parse user input.', safeUser.error);
  }

  const { email, password } = safeUser.data;

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
        password: hashedPassword
      })
      .returning();

    const result = userPublicSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError(
        'Failed to parse user inserted user.',
        result.error
      );
    }

    return actionSuccess(result.data);
  } catch (error) {
    return actionError('Failed to insert user into database.');
  }
}

export async function getUserById(userId?: string): ActionResponse<z.infer<typeof userPublicSchema>> {
  const input = userIdSchema.safeParse({ id: userId });
  if (!input.success) {
    return actionZodError('The id input is not valid.', input.error);
  }

  const { id } = input.data;

  try {
    const userSelect = await db.query.users
      .findFirst({
        where: eq(users.id, id)
      });

    const safeUser = userPublicSchema.safeParse(userSelect);
    if (!safeUser.success) {
      return actionZodError(
        'There\'s an issue with the user record.',
        safeUser.error
      );
    }

    return actionSuccess(safeUser.data);
  } catch {
    return actionError('Failed to fetch user from database.');
  }
}

export async function getUserByEmail(unsafeEmail: string): ActionResponse<z.infer<typeof userSchema>> {
  const safeEmail = userEmailSchema.safeParse({ email: unsafeEmail });
  if (!safeEmail.success) {
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
        'There\'s an issue with the user record.',
        safeUser.error
      );
    }

    return actionSuccess(safeUser.data);
  } catch {
    return actionError('Failed to fetch user from database.');
  }
}

export async function getApiKeyById(apiKey: string): ActionResponse<ApiKey> {
  const input = apiKeySchema.pick({id: true}).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
    });

    const safe = apiKeySchema.safeParse(result);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch {
    return actionError('Failed to fetch user from database.');
  }
}

export async function getApiKeyByKey(apiKey: string): ActionResponse<ApiKey> {
  const input = apiKeySchema.pick({id: true}).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.key, id),
    });

    const safe = apiKeySchema.safeParse(result);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch {
    return actionError('Failed to fetch user from database.');
  }
}

export async function upsertApiKey(key: NewApiKey): ActionResponse<ApiKey> {
  const input = newApiKeySchema.safeParse(key);
  if (!input.success) {
    return actionZodError('The resources are not valid.', input.error);
  }

  try {
    const insert = await db
      .insert(apiKeys)
      .values(input.data)
      .onConflictDoUpdate({
        target: apiKeys.id,
        set: {
          permissions: input.data.permissions,
        },
      })
      .returning();

    const safeKey = apiKeySchema.safeParse(insert[0]);
    if (!safeKey.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safeKey.error
      );
    }

    return actionSuccess(safeKey.data);
  } catch (error) {
    console.error(error)
    return actionError('Failed to insert an API key into the database.');
  }
}

export async function getApiKeys(userId?: string): ActionResponse<z.infer<typeof apiKeyPublicSchema>[]> {
  const input = userIdSchema.safeParse({ id: userId });
  if (!input.success) {
    return actionZodError('The user id is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const select = await db.select()
        .from(apiKeys)
       .where(eq(apiKeys.user_id, id))

    const safe = z.array(apiKeyPublicSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the api keys records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error){
    console.log("error",error)
    return actionError('Failed to fetch users from database.');
  }
}

export async function getUsers(): ActionResponse<PublicUser[]> {
  try {
    const userSelect = await db
      .select()
      .from(users);

    const safeUsers = z.array(userPublicSchema).safeParse(userSelect);
    if (!safeUsers.success) {
      return actionZodError('There\'s an issue with the user records.', safeUsers.error);
    }

    return actionSuccess(safeUsers.data);
  } catch {
    return actionError('Failed to fetch users from database.');
  }
}
