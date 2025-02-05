import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { apiKeys, invites, users } from '@/data/users/schema';
import { z } from 'zod';

export const apiKeyPermissionsSchema = z.record(z.enum(['read', 'write', 'none'])).nullable()
export type ApiKeyPermissions = z.infer<typeof apiKeyPermissionsSchema>

export const userSchema = createSelectSchema(users);
export type User = z.infer<typeof userSchema>

export const userPublicSchema = userSchema
  .extend({
    email: z.string().email().nullable()
  })
  .omit({
    password: true
  });
export type PublicUser = z.infer<typeof userPublicSchema>

export const userIdSchema = userSchema
  .pick({ id: true });
export type UserId = z.infer<typeof userIdSchema>

export const newUserSchema  = createInsertSchema(users)
export type NewUser = z.infer<typeof newUserSchema>

export const newCredentialsUserSchema =  createInsertSchema(users, {
  password: (schema) => schema.password.min(8, 'Password must be longer than 8 characters'),
  email: (schema) => schema.email.email()
})
  .required({
    password: true,
    email: true
  })
  .omit({ id: true });
export type NewCredentialsUser = z.infer<typeof newCredentialsUserSchema>

export const newServiceUserSchema =  newUserSchema.pick({
  id: true,
  name: true,
  issuer: true,
  subject: true,
  client_id: true,
  client_secret: true,
}).extend({
  client_id: z.string(),
})

export type NewServiceUserSchema = z.infer<typeof newServiceUserSchema>

export const updatePasswordSchema = userSchema
  .pick({id: true})
  .extend({
    password: newCredentialsUserSchema.shape.password,
    oldPassword: newCredentialsUserSchema.shape.password
  })
export type UpdatePassword = z.infer<typeof updatePasswordSchema>

export const updateRoleSchema = userSchema
  .pick({id: true, role: true})
export type UpdateRole = z.infer<typeof updateRoleSchema>

export const userLoginSchema = z.object({
  password: z.string(),
  email: z.string(),
})
export type UserLogin = z.infer<typeof userLoginSchema>

export const userEmailSchema = newUserSchema.pick({
  email: true
})
  .extend({
    email: newUserSchema.shape.email.unwrap()
  });

export const apiKeySchema = createSelectSchema(apiKeys)
  .extend({
    permissions: apiKeyPermissionsSchema,
    member_permissions: apiKeyPermissionsSchema,
  })
export type ApiKey = z.infer<typeof apiKeySchema>

const transformId = val => ({
  ...val,
  key: '************' + val.key.substr(val.id.length - 13)
});
export const apiKeyPublicSchema = apiKeySchema
  .omit({member_permissions: true})
  .transform(transformId);
export type PublicApiKey = z.infer<typeof apiKeyPublicSchema>

export const newApiKeySchema = createInsertSchema(apiKeys)
  .extend({
    permissions: apiKeyPermissionsSchema,
  })
export type NewApiKey = z.infer<typeof newApiKeySchema>

export const inviteSchema = createSelectSchema(invites)
export type Invite = z.infer<typeof inviteSchema>

export const newInviteSchema = createInsertSchema(invites)
export type NewInvite = z.infer<typeof newInviteSchema>
