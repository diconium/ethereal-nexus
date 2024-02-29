import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { apiKeys, users } from '@/data/users/schema';
import { z } from 'zod';

export const apiKeyPermissionsSchema = z.record(z.enum(['read', 'write', 'none'])).nullable()
export type ApiKeyPermissions = z.infer<typeof apiKeyPermissionsSchema>

export const userSchema = createSelectSchema(users);
export type User = z.infer<typeof userSchema>

export const userPublicSchema = userSchema
  .omit({
    password: true
  });
export type PublicUser = z.infer<typeof userPublicSchema>

export const userIdSchema = userSchema
  .pick({ id: true });
export type UserId = z.infer<typeof userIdSchema>

export const newUserSchema = createInsertSchema(users, {
  password: (schema) => schema.password
    .min(8, 'Password must be longer than 8 characters'),
  email: (schema) => schema.email.email()
})
  .required({
    password: true
  })
  .omit({ id: true });

export const userLoginSchema = newUserSchema.pick({
  password: true,
  email: true
});

export const userEmailSchema = newUserSchema.pick({
  email: true
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
