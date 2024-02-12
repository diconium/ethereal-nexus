import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { apiKeys, users } from '@/data/users/schema';
import { z } from 'zod';

export const userSchema = createSelectSchema(users);
export type User = z.infer<typeof userSchema>;

export const userPublicSchema = userSchema.omit({
  password: true,
});
export type PublicUser = z.infer<typeof userPublicSchema>;

export const userIdSchema = userSchema.pick({ id: true });
export type UserId = z.infer<typeof userIdSchema>;

export const newUserSchema = createInsertSchema(users, {
  password: (schema) =>
    schema.password.min(8, 'Password must be longer than 8 characters'),
  email: (schema) => schema.email.email(),
})
  .required({
    password: true,
  })
  .omit({ id: true });

export const userLoginSchema = newUserSchema.pick({
  password: true,
  email: true,
});

export const userEmailSchema = newUserSchema.pick({
  email: true,
});

export const userApiKeySchema = createSelectSchema(apiKeys);
export const apiKeySchema = createSelectSchema(apiKeys);
export const selectApiKeySchema = createSelectSchema(apiKeys).pick({
  id: true,
});

export const apiKeyPublicSchema = apiKeySchema
  .omit({ user_id: true })
  .transform((val) => ({
    ...val,
    id: '************' + val.id.substr(val.id.length - 13),
  }));

export const newUserApiKeySchema = createInsertSchema(apiKeys);
