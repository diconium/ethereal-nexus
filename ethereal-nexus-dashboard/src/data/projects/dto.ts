import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { projects } from '@/data/projects/schema';

export const projectsSchema = createSelectSchema(projects);

export const newProjectSchema = createInsertSchema(projects, {
  name: (schema) =>
    schema.name.min(4, 'Password must be longer than 4 characters'),
})
  .required({ name: true })
  .omit({ id: true, components: true });
