import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { members } from './schema';
import { userPublicSchema } from '@/data/users/dto';

export const memberSchema = createSelectSchema(members)

export const newMemberSchema = createInsertSchema(members)
export const memberWithPublicUserSchema = memberSchema.extend({
  user: userPublicSchema,
})