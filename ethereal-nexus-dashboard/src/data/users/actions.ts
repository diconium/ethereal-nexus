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
  newUserSchema, PublicApiKey,
  PublicUser,
  userEmailSchema,
  userIdSchema,
  userPublicSchema,
  userSchema
} from '@/data/users/dto';
import { z } from 'zod';
import { and, eq, getTableColumns, isNotNull, sql } from 'drizzle-orm';
import { ActionResponse } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { members } from '@/data/member/schema';
import { lowestPermission } from '@/data/users/permission-utils';
import { projects } from '@/data/projects/schema';
import { userIsMember } from '@/data/member/actions';
import { projectSchema } from '@/data/projects/dto';

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

export async function getApiKeyById(apiKey: string): ActionResponse<Omit<ApiKey, 'member_permissions'>> {
  const input = apiKeySchema.pick({id: true}).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
    });

    const safe = apiKeySchema.omit({member_permissions: true}).safeParse(result);
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

const apiKeyValidPermissions = apiKeySchema.transform(val => {
  let permissions = val.permissions;
  if(val.permissions && val.member_permissions) {
    permissions = Object.keys(val.permissions).reduce((acc, resource) => {
      acc[resource] = lowestPermission(val.permissions?.[resource]!, val.member_permissions?.[resource]!)
      return acc
    }, {})
  }

  return {
    ...val,
    permissions,
    member_permissions: undefined
  }
})

export async function getApiKeyByKey(apiKey: string): ActionResponse<z.infer<typeof apiKeyValidPermissions>> {
  const input = apiKeySchema.pick({id: true}).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;

  try {
    const permissions = db.select({
      id: apiKeys.id,
      user_id: apiKeys.user_id,
      api_resource: sql`jsonb_object_keys(${apiKeys.permissions})`.as('api_resource'),
    })
      .from(apiKeys)
      .as('api_resource')

    const result = await db.select({
      ...getTableColumns(apiKeys),
      member_permissions: sql`jsonb_object_agg(${members.resource}, ${members.permissions})`
    })
      .from(apiKeys)
      .leftJoin(permissions, eq(permissions.id, apiKeys.id) )
      .leftJoin(members,
        and(
          eq(sql`${members.resource}::text`, permissions.api_resource),
          eq(members.user_id, apiKeys.user_id),
        )
      )
      .where(
        and(
          eq(apiKeys.key, id),
          isNotNull(members.id)
        )
      )
      .groupBy(
        apiKeys.id,
      );

    console.log(result)

    const safe = apiKeyValidPermissions.array().safeParse(result);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safe.error
      );
    }

    return actionSuccess(safe.data[0]);
  } catch (error) {
    console.log(error)
    return actionError('Failed to fetch user from database.');
  }
}

export async function upsertApiKey(key: NewApiKey): ActionResponse<Omit<ApiKey, 'member_permissions'>> {
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
          alias: input.data.alias,
          permissions: input.data.permissions,
        },
      })
      .returning();

    const safeKey = apiKeySchema.omit({member_permissions: true}).safeParse(insert[0]);
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

export async function deleteApiKey(id: string, userId: string | undefined): ActionResponse<PublicApiKey> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const deleted = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.user_id, userId), eq(apiKeys.id, id)))
      .returning();

    const safeDeleted = apiKeyPublicSchema.safeParse(deleted);
    if (!safeDeleted.success) {
      return actionZodError('There\'s an issue with the API key record.', safeDeleted.error);
    }

    return actionSuccess(safeDeleted.data);
  } catch {
    return actionError('Failed to delete key from database.');
  }
}
