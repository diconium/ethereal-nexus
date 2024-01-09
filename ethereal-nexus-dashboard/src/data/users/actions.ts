'use server';

import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '@/db';
import { users } from '@/data/users/schema';
import { newUserSchema, userPublicSchema, userSchema } from '@/data/users/dto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { Result } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';

export async function insertUser(user: z.infer<typeof newUserSchema>): Promise<Result<z.infer<typeof userPublicSchema>>> {
  const safeUser = newUserSchema.safeParse(user);
  if(!safeUser.success){
    return actionZodError('Failed to parse user input.', safeUser.error);
  }

  const { email, password } = safeUser.data;

  const existingUser = await db.select({id: users.id}).from(users).where(eq(users.email, email))
  if(existingUser.length > 0) {
    return actionError('User with that email already exists.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password!, 10)
    const insert = await db.insert(users)
      .values({
        ...user,
        id: randomUUID(),
        password: hashedPassword
      })
      .returning();

    const result = userPublicSchema.safeParse(insert[0]);
    if (!result.success) {
      return actionZodError( 'Failed to parse user inserted user.', result.error);
    }

    return actionSuccess(result.data);
  } catch (error) {
    return actionError( 'Failed to insert user onto database.')
  }
}