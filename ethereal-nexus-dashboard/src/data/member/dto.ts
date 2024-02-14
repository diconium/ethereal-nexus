import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { members } from './schema';
import { userPublicSchema } from '@/data/users/dto';
import { z } from 'zod';

export const memberSchema = createSelectSchema(members)
export type Member =  z.infer<typeof memberSchema>

export const newMemberSchema = createInsertSchema(members)

export const updateMemberPermissionsSchema = newMemberSchema.pick({id: true, permissions: true}).required({id: true})
export type UpdateMemberPermissions = z.infer<typeof updateMemberPermissionsSchema>

export const memberWithPublicUserSchema = memberSchema.extend({
  user: userPublicSchema,
})
export type MemberWithPublicUser =  z.infer<typeof memberWithPublicUserSchema>