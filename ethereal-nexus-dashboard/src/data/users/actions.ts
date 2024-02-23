'use server';

import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { apiKeys, users } from '@/data/users/schema';
import {
  ApiKey, ApiKeyPermissions, apiKeyPermissionsSchema,
  apiKeyPublicSchema,
  apiKeySchema, apiKeyWithProjectNamesAndPermissionsPublicSchema,
  newUserSchema, PublicUser,
  userEmailSchema, userIdSchema,
  userPublicSchema,
  userSchema
} from '@/data/users/dto';
import { z } from 'zod';
import {eq, getTableColumns, ne, sql} from 'drizzle-orm';
import { ActionResponse, Result } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import * as process from "process";
import {projects} from "@/data/projects/schema";
import {text} from "drizzle-orm/pg-core";

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

export async function getApiKey(apiKey: string): ActionResponse<ApiKey> {
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

export async function insertUserApiKey(permissions: ApiKeyPermissions, userId?: string): ActionResponse<ApiKey> {
  const input = apiKeyPermissionsSchema.safeParse(permissions);
  console.log(JSON.stringify(input, undefined, 2))

  if (!input.success) {
    return actionZodError('The resources are not valid.', input.error);
  }

  try {
    const insert = await db
      .insert(apiKeys)
      .values({
        user_id: userId,
        permissions
      })
      .returning();

    console.log(insert)
    const safeKey = apiKeySchema.safeParse(insert[0]);
    if (!safeKey.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safeKey.error
      );
    }

    return actionSuccess(safeKey.data);
  } catch {
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
    // const select = await db.query.apiKeys.findMany({
    //   where: eq(apiKeys.user_id, id)
    // });

    const subquery = db.select({id: apiKeys.id, project_json: sql`json_object_keys(${apiKeys.permissions}::json)`.as('project_json')}).from(apiKeys).as('perm');
    // const subquery = await db.select('id', sql`json_object_keys(permissions::json) as project_json`).from('api_key');
    const select = await db.select({... getTableColumns(apiKeys), project_name: sql`ARRAY_AGG(${projects.name})`, project_permissions: sql`ARRAY_AGG(${apiKeys.permissions}::json->>perm.project_json)`}
    )
        .from(apiKeys)
        .leftJoin(
            subquery,
            eq(subquery.id,apiKeys.id)
        )
        .leftJoin(
            projects,
            eq(sql`${projects.id}::text` ,subquery.project_json)
        )
        .groupBy(apiKeys.id)
        .where(ne(subquery.project_json, 'components'))
        .where(eq(apiKeys.user_id, id))

    // SELECT api_key.id,
    //     api_key.created_at,
    //     array_agg(name) AS project_name,
    //     array_agg(api_key.permissions::json->>perm.project_json) AS permission
    // FROM api_key
    // LEFT JOIN (SELECT id, json_object_keys(permissions::json) as project_json FROM api_key) as perm
    // ON perm.id=api_key.id
    // LEFT JOIN project
    // ON project.id::text=perm.project_json
    // WHERE perm.project_json != 'components'
    // GROUP BY api_key.id




console.log("select",select)
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

export async function getApiKeysWithProjectNamesAndPermissions(userId?: string): ActionResponse<z.infer<typeof apiKeyPublicSchema>[]> {
  const input = userIdSchema.safeParse({ id: userId });
  if (!input.success) {
    return actionZodError('The user id is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    // const select = await db.query.apiKeys.findMany({
    //   where: eq(apiKeys.user_id, id)
    // });

    const subquery = db.select({id: apiKeys.id, project_json: sql`json_object_keys(${apiKeys.permissions}::json)`.as('project_json')}).from(apiKeys).as('perm');
    // const subquery = await db.select('id', sql`json_object_keys(permissions::json) as project_json`).from('api_key');
    const select = await db.select({... getTableColumns(apiKeys), project_name: sql`ARRAY_AGG(${projects.name})`, project_permissions: sql`ARRAY_AGG(${apiKeys.permissions}::json->>perm.project_json)`}
    )
        .from(apiKeys)
        .leftJoin(
            subquery,
            eq(subquery.id,apiKeys.id)
        )
        .leftJoin(
            projects,
            eq(sql`${projects.id}::text` ,subquery.project_json)
        )
        .groupBy(apiKeys.id)
        .where(eq(apiKeys.user_id, id))
        .where(ne(subquery.project_json, 'components'))

    // SELECT api_key.id,
    //     api_key.created_at,
    //     array_agg(name) AS project_name,
    //     array_agg(api_key.permissions::json->>perm.project_json) AS permission
    // FROM api_key
    // LEFT JOIN (SELECT id, json_object_keys(permissions::json) as project_json FROM api_key) as perm
    // ON perm.id=api_key.id
    // LEFT JOIN project
    // ON project.id::text=perm.project_json
    // WHERE perm.project_json != 'components'
    // GROUP BY api_key.id




console.log("select",select)
    const safe = z.array(apiKeyWithProjectNamesAndPermissionsPublicSchema).safeParse(select);
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
