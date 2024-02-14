'use server';

import { ActionResponse } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { eq, inArray } from 'drizzle-orm';
import { members as memberTable } from '@/data/member/schema';
import {
  Member,
  memberSchema, MemberWithPublicUser,
  memberWithPublicUserSchema,
  newMemberSchema,
  UpdateMemberPermissions,
  updateMemberPermissionsSchema
} from '@/data/member/dto';
import { projects } from '@/data/projects/schema';

export async function getMembersByResourceId(id: string, userId: string | undefined | null): ActionResponse<MemberWithPublicUser[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  if (!id) {
    return actionError('No resource identifier provided.');
  }

  try {
    const select = await db.query.members
      .findMany({
        where: eq(memberTable.resource, id),
        with: {
          user: true
        }
      });

    const safe = z.array(memberWithPublicUserSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the member records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch members from database.');
  }
}

export async function getMembersByUser(userId: string | undefined | null): ActionResponse<Member[]> {
  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const select = await db.query.members
      .findMany({
        where: eq(memberTable.user_id, userId),
      });

    const safe = z.array(memberSchema).safeParse(select);
    if (!safe.success) {
      return actionZodError('There\'s an issue with the member records.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch members from database.');
  }
}


export async function insertMembers(members: z.infer<typeof newMemberSchema>[]): ActionResponse<z.infer<typeof memberSchema>[]> {
  const input = z.array(newMemberSchema).safeParse(members);
  if (!input.success) {
    return actionZodError('Failed to parse member input.', input.error);
  }

  try {
    const insert = await db.insert(memberTable)
      .values(members)
      .returning();

    const result = z.array(memberSchema).safeParse(insert);
    if (!result.success) {
      return actionZodError('Failed to parse user inserted user.', result.error);
    }

    return actionSuccess(result.data);
  } catch (error) {
    return actionError('Failed to insert user into database.');
  }
}

export async function updateMemberPermissions(member: UpdateMemberPermissions) {
  const input = updateMemberPermissionsSchema.safeParse(member);
  if (!input.success) {
    return actionZodError('Failed to parse member input.', input.error);
  }


  const { id, permissions } = input.data;
  try {
    const update = await db.update(memberTable)
      .set({ permissions })
      .where(eq(memberTable.id, id))
      .returning();

    const result = memberSchema.safeParse(update);
    if (!result.success) {
      return actionZodError('Failed to parse updated user.', result.error);
    }
  } catch (error) {
    return actionError('Failed to update user permissions into database.');
  }
}

export const userIsMember = (userId: string) => inArray(
  projects.id,
  db.select({ id: memberTable.resource })
    .from(memberTable)
    .where(
      eq(memberTable.user_id, userId)
    )
);