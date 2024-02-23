import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { apiKeys, users } from '@/data/users/schema';
import { z } from 'zod';

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

export const apiKeySchema = createSelectSchema(apiKeys);
export type ApiKey = z.infer<typeof apiKeySchema>

export const apiKeyPermissionsSchema = z.record(z.enum(['read', 'write', 'none']).optional())
export type ApiKeyPermissions = z.infer<typeof apiKeyPermissionsSchema>

const transformId = val => ({
    ...val,
    id: '************' + val.id.substr(val.id.length - 13)
});
export const apiKeyPublicSchema = apiKeySchema.omit({ user_id: true })
  .transform(transformId);

export const newUserApiKeySchema = createInsertSchema(apiKeys)
  .extend({
  resources: apiKeyPermissionsSchema,
})

export const apiKeyWithProjectNamesAndPermissionsPublicSchema = z.object({
    ...apiKeySchema.shape,
    project_name: z.array(z.string().nullable()),
    project_permissions: z.array(z.string()),
}) .transform(transformId);
