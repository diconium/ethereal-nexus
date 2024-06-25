import { createSelectSchema } from 'drizzle-zod';
import { resources } from '@/data/resources/schema';
import { z } from 'zod';

export const resourceSchema = createSelectSchema(resources);


export type Resource =  z.infer<typeof resourceSchema>