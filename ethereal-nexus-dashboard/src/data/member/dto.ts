import { createSelectSchema } from 'drizzle-zod';
import { members } from './schema';

export const memberSchema = createSelectSchema(members)
