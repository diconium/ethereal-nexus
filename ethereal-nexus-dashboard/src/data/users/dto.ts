import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from '@/data/users/schema';

export const userSchema = createSelectSchema(users)

export const userPublicSchema = createSelectSchema(users)
  .omit({
    password: true
  });

export const newUserSchema = createInsertSchema(users, {
  password: (schema) => schema.password
    .min(8, 'Password must be longer than 8 characters')
})
  .required({
    password: true
  })
  .omit({ id: true });

export const userLoginSchema = newUserSchema.pick({
  password: true,
  email: true,
})
