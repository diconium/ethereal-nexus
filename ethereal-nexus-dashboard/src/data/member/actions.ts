'use server';

import { Result } from '@/data/action';
import { z } from 'zod';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { eq } from 'drizzle-orm';
import { members as memberTable } from '@/data/member/schema';
import { memberSchema, memberWithPublicUserSchema, newMemberSchema } from '@/data/member/dto';

export async function getMembersByResourceId(id: string, userId: string | undefined | null): Promise<Result<z.infer<typeof memberWithPublicUserSchema>[]>> {
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
          user: true,
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

export async function insertMembers(members: z.infer<typeof newMemberSchema>[]): Promise<Result<z.infer<typeof memberSchema>[]>> {
  const input = z.array(newMemberSchema).safeParse(members)
  if(!input.success){
    return actionZodError('Failed to parse member input.', input.error);
  }

  try {
    const insert = await db.insert(memberTable)
      .values(members)
      .returning();

    const result = z.array(memberSchema).safeParse(insert);
    if (!result.success) {
      return actionZodError( 'Failed to parse user inserted user.', result.error);
    }

    return actionSuccess(result.data);
  } catch (error) {
    return actionError( 'Failed to insert user onto database.')
  }
}