'use server';

import * as bcrypt from 'bcryptjs';
import { db } from '@/db';
import { apiKeys, invites, users } from '@/data/users/schema';
import {
  ApiKey,
  ApiKeyPermissions,
  apiKeyPublicSchema,
  apiKeySchema,
  Invite,
  inviteSchema,
  NewApiKey,
  newApiKeySchema,
  NewCredentialsUser,
  newCredentialsUserSchema,
  NewInvite,
  newInviteSchema,
  newServiceUserSchema,
  NewServiceUserSchema,
  NewUser,
  newUserSchema,
  PublicApiKey,
  PublicUser,
  UpdatePassword,
  UpdateRole,
  User,
  userIdSchema,
  UserLogin,
  userPublicSchema,
  userSchema
} from '@/data/users/dto';
import { z } from 'zod';
import { and, eq, getTableColumns, isNotNull, sql } from 'drizzle-orm';
import { ActionResponse } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { members } from '@/data/member/schema';
import { lowestPermission } from '@/data/users/permission-utils';
import { auth, signIn, signOut } from '@/auth';
import process from 'node:process';
import { AuthError } from 'next-auth';

type Providers = 'credentials' | 'github' | 'microsoft-entra-id' | 'azure-communication-service';

export async function login(provider: Providers, login?: UserLogin) {
  try {
    await signIn(
      provider,
      {
        email: login?.email,
        identifier: login?.email,
        password: login?.password,
        redirectTo: '/'
      },
      {
        signin_type: 'login'
      }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return actionError(error.message);
    }
    throw error;
  }
}


export async function logout() {
  return await signOut();
}

async function insertUser(user: NewUser): ActionResponse<PublicUser> {
  try {
    const insert = await db.insert(users).values(user).returning();

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

async function insertCredentialsUser(
  user: {
    email: string
    password: string
  }
): ActionResponse<PublicUser> {
  const { email, password } = user;

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(
      eq(users.email, email)
    );
  if (existingUser.length > 0) {
    return actionError('User with that email already exists.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password!, 10);
    return insertUser({
      ...user,
      password: hashedPassword,
    });
  } catch (error) {
    return actionError('Failed to insert user into database.');
  }
}

export async function insertInvitedCredentialsUser(
  user: any,
  key?: string | null
): ActionResponse<PublicUser> {
  if (!key) {
    return actionError('No invite key was provided.');
  }

  const safeUser = newCredentialsUserSchema.safeParse(user);
  if (!safeUser.success) {
    return actionZodError('Failed to parse user input.', safeUser.error);
  }

  const invite = await db
    .select({ id: invites.id, email: invites.email })
    .from(invites)
    .where(eq(invites.key, key));

  if (invite.length <= 0) {
    return actionError('No invite matches the key.');
  }
  if (
    invite[0].email.localeCompare(user.email, undefined, {
      sensitivity: 'base'
    }) !== 0
  ) {
    return actionError('The emails doesn\'t match the invite.');
  }

  const result = await insertCredentialsUser(user);

  if (result.success) {
    await deleteInvite(key);

    if (process.env.COMMUNICATION_SERVICES_CONNECTION_STRING) {
      await login('azure-communication-service', user);
    }
  }
  return result;
}

export async function insertInvitedSsoUser(
  user: any
): ActionResponse<PublicUser> {
  const safeUser = newUserSchema.safeParse(user);
  if (!safeUser.success) {
    return actionZodError('Failed to parse user input.', safeUser.error);
  }
  const email = safeUser.data.email;

  const invite = await db
    .select({ id: invites.id, email: invites.email, key: invites.key })
    .from(invites)
    .where(eq(invites.email, email!));

  if (invite.length === 0) {
    return actionError('No invite matches the email.');
  }
  await deleteInvite(invite[0].key);

  return insertUser(safeUser.data);
}

export async function insertServiceUser(
  user: NewServiceUserSchema
): ActionResponse<PublicUser> {
  const safeUser = newServiceUserSchema.safeParse(user);
  if (!safeUser.success) {
    return actionZodError('Failed to parse user input.', safeUser.error);
  }

  try {
    return insertUser(safeUser.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert service user into database.');
  }
}

export async function getUserById(userId?: string): ActionResponse<User> {
  try {
    if (!userId) {
      return actionError('No user id provided.');
    }

    const userSelect = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    const safeUser = userSchema.safeParse(userSelect);
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

export async function getPublicUserById(
  userId?: string
): ActionResponse<PublicUser> {
  try {
    const input = userIdSchema.safeParse({ id: userId });
    if (!input.success) {
      return actionZodError('The id input is not valid.', input.error);
    }

    const user = await getUserById(input.data.id);
    if (!user.success) {
      return user;
    }

    const safeUser = userPublicSchema.safeParse(user.data);
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

export async function getUserByEmail(
  email: string | undefined | null
): ActionResponse<User> {
  if (!email) {
    return actionError('The email input is not valid.');
  }

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

export async function deleteUser(
  id: string
): ActionResponse<PublicUser> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError('No user provided.');
  }
  const role = session.user.role;

  if (role !== 'admin') {
    return actionError('Forbidden.');
  }

  try {
    const deleted = await db
      .delete(users)
      .where(
        eq(users.id, id)
      )
      .returning();

    const safeDeleted = userPublicSchema.safeParse(deleted[0]);
    if (!safeDeleted.success) {
      return actionZodError(
        'There\'s an issue with the API key record.',
        safeDeleted.error
      );
    }

    return actionSuccess(safeDeleted.data);
  } catch {
    return actionError('Failed to delete user from database.');
  }
}

export async function getApiKeyById(
  apiKey: string
): ActionResponse<Omit<ApiKey, 'member_permissions'>> {
  const input = apiKeySchema.pick({ id: true }).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id)
    });

    const safe = apiKeySchema
      .omit({ member_permissions: true })
      .safeParse(result);
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

const apiKeyValidPermissions = apiKeySchema.transform((val) => {
  let permissions = val.permissions;
  const memberPermissions = val.member_permissions;

  if (permissions && memberPermissions) {
    permissions = Object.keys(permissions).reduce((acc, resource) => {
      const keyPermission = permissions![resource];
      const memberPermission = memberPermissions[resource];

      if (!memberPermission) {
        acc[resource] = keyPermission;
      } else {
        acc[resource] = lowestPermission(keyPermission, memberPermission);
      }

      return acc;
    }, {});
  }

  return {
    ...val,
    permissions,
    member_permissions: undefined
  };
});

export async function getApiKeyByKey(
  apiKey: string
): ActionResponse<z.infer<typeof apiKeyValidPermissions>> {
  const input = apiKeySchema.pick({ id: true }).safeParse({ id: apiKey });
  if (!input.success) {
    return actionZodError('The api key is not valid.', input.error);
  }

  const { id } = input.data;

  try {
    const permissions = db
      .select({
        id: apiKeys.id,
        user_id: apiKeys.user_id,
        api_resource: sql`jsonb_object_keys
            (${apiKeys.permissions})`.as(
          'api_resource'
        )
      })
      .from(apiKeys)
      .as('api_resource');

    const result = await db
      .select({
        ...getTableColumns(apiKeys),
        member_permissions: sql`jsonb_object_agg
            (${members.resource}, ${members.permissions})`
      })
      .from(apiKeys)
      .leftJoin(permissions, eq(permissions.id, apiKeys.id))
      .leftJoin(
        members,
        and(
          eq(sql`${members.resource}::text`, permissions.api_resource),
          eq(members.user_id, apiKeys.user_id)
        )
      )
      .where(and(eq(apiKeys.key, id), isNotNull(members.id)))
      .groupBy(apiKeys.id);

    const safe = apiKeyValidPermissions.array().safeParse(result);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safe.error
      );
    }
    return actionSuccess(safe.data[0]);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch user from database.');
  }
}

export async function upsertApiKey(
  key: NewApiKey
): ActionResponse<Omit<ApiKey, 'member_permissions'>> {
  const input = newApiKeySchema.safeParse(key);
  if (!input.success) {
    return actionZodError('The resources are not valid.', input.error);
  }

  try {
    const insert = await db
      .insert(apiKeys)
      .values({
        ...input.data
      })
      .onConflictDoUpdate({
        target: apiKeys.id,
        set: {
          alias: input.data.alias,
          permissions: input.data.permissions
        }
      })
      .returning();

    const safeKey = apiKeySchema
      .omit({ member_permissions: true })
      .safeParse(insert[0]);
    if (!safeKey.success) {
      return actionZodError(
        'There\'s an issue with the api key record.',
        safeKey.error
      );
    }

    return actionSuccess(safeKey.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert an API key into the database.');
  }
}

export async function getApiKeys(
  userId?: string
): ActionResponse<z.infer<typeof apiKeyPublicSchema>[]> {
  const input = userIdSchema.safeParse({ id: userId });
  if (!input.success) {
    return actionZodError('The user id is not valid.', input.error);
  }

  const { id } = input.data;
  try {
    const select = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.user_id, id));

    const safe = z.array(apiKeyPublicSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the api keys records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch users from database.');
  }
}

export async function getUsers(): ActionResponse<PublicUser[]> {
  try {
    const userSelect = await db.select().from(users);

    const safeUsers = z.array(userPublicSchema).safeParse(userSelect);
    if (!safeUsers.success) {
      return actionZodError(
        'There\'s an issue with the user records.',
        safeUsers.error
      );
    }

    return actionSuccess(safeUsers.data);
  } catch {
    return actionError('Failed to fetch users from database.');
  }
}

export async function deleteApiKey(
  id: string,
  userId: string | undefined
): ActionResponse<PublicApiKey> {
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
      return actionZodError(
        'There\'s an issue with the API key record.',
        safeDeleted.error
      );
    }

    return actionSuccess(safeDeleted.data);
  } catch {
    return actionError('Failed to delete key from database.');
  }
}

export async function insertInvite(invite: NewInvite): ActionResponse<Invite> {
  const input = newInviteSchema.safeParse(invite);
  if (!input.success) {
    return actionZodError('Failed to parse invite input.', input.error);
  }

  const { email } = input.data;

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existingUser.length > 0) {
    return actionError('User with that email already exists.');
  }

  try {
    const insert = await db.insert(invites).values(input.data).returning();

    const result = inviteSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError('Failed to parse inserted invite.', result.error);
    }

    return actionSuccess(result.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert invite into database.');
  }
}

export async function deleteInvite(key: string): ActionResponse<Invite> {
  try {
    const deleted = await db.delete(invites).where(eq(invites.key, key));

    const safeDeleted = inviteSchema.safeParse(deleted);
    if (!safeDeleted.success) {
      return actionZodError(
        'There\'s an issue with the invite record.',
        safeDeleted.error
      );
    }

    return actionSuccess(safeDeleted.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete invite from database.');
  }
}

export async function updateUser(user: PublicUser): ActionResponse<PublicUser> {
  try {
    const updated = await db
      .update(users)
      .set({
        name: user.name,
        email: user.email
      })
      .where(eq(users.id, user.id))
      .returning();

    const safeUpdated = userPublicSchema.safeParse(updated[0]);
    if (!safeUpdated.success) {
      return actionZodError(
        'There\'s an issue with the user record.',
        safeUpdated.error
      );
    }

    return actionSuccess(safeUpdated.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to update user on the database.');
  }
}

export async function updateUserPassword(
  user: UpdatePassword
): ActionResponse<PublicUser> {
  try {
    const existingUser = await getUserById(user.id);
    if (
      !existingUser.success ||
      !existingUser.data.password ||
      !user.oldPassword
    ) {
      return actionError('Cannot update user\'s password.');
    }

    const passwordMatches = bcrypt.compare(
      user.oldPassword,
      existingUser.data.password
    );
    if (!passwordMatches) {
      return actionError('Cannot update user\'s password.');
    }

    const newPassword = await bcrypt.hash(user.password!, 10);
    const updated = await db
      .update(users)
      .set({
        password: newPassword
      })
      .where(eq(users.id, user.id))
      .returning();

    const safeUpdated = userPublicSchema.safeParse(updated[0]);
    if (!safeUpdated.success) {
      return actionZodError(
        'There\'s an issue with the user record.',
        safeUpdated.error
      );
    }

    return actionSuccess(safeUpdated.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to update user password on the database.');
  }
}

export async function updateUserRole(
  user: UpdateRole
): ActionResponse<PublicUser> {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return actionError('Forbidden.');
  }

  try {
    const updated = await db
      .update(users)
      .set(user)
      .where(eq(users.id, user.id))
      .returning();

    const safeUpdated = userPublicSchema.safeParse(updated[0]);
    if (!safeUpdated.success) {
      return actionZodError(
        'There\'s an issue with the user record.',
        safeUpdated.error
      );
    }

    return actionSuccess(safeUpdated.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to update user role on the database.');
  }
}


export async function getServiceUser(issuer: string, subject: string): ActionResponse<NewServiceUserSchema & {
  permissions: ApiKeyPermissions
}> {
  try {
    const user = await db.select({
      id: users.id,
      subject: users.subject,
      issuer: users.issuer,
      client_id: users.client_id,
      client_secret: users.client_secret,
      permissions: sql`jsonb_object_agg
          (${members.resource}, ${members.permissions})`
    })
      .from(users)
      .where(
        and(
          eq(users.issuer, issuer),
          eq(users.subject, subject)
        )
      )
      .leftJoin(
        members,
        eq(members.user_id, users.id)
      )
      .groupBy(users.id);

    return actionSuccess(user);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch service user on the database.');
  }
}