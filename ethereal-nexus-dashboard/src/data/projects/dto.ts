import { createSelectSchema } from 'drizzle-zod';
import { projects } from '@/data/projects/schema';

export const projectsSchema = createSelectSchema(projects);
