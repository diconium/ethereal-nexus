import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { events } from '@/data/events/schema';
import {
  componentsSchema,
  componentVersionsSchema,
} from '@/data/components/dto';
import { projectSchema } from '@/data/projects/dto';
import { userPublicSchema, userSchema } from '@/data/users/dto';

export const eventsSchema = createSelectSchema(events);
export type Event = z.infer<typeof eventsSchema>;

export const newEventSchema = createInsertSchema(events);
export type NewEvent = z.infer<typeof newEventSchema>;

export const eventWithUserAndVersionSchema = eventsSchema.extend({
  name: z.string(),
  version: z.string(),
});
export type EventWithUsername = z.infer<typeof eventWithUserAndVersionSchema>;

export const eventWithDiscriminatedUnions = eventsSchema.extend({
  user: userPublicSchema,
  data: z.object({
    version: componentVersionsSchema.nullish(),
    project: projectSchema.nullish(),
    component: componentsSchema.nullish(),
    member: userSchema.nullish(),
    permissions: z.string().nullish(),
  }),
});
export type EventWithDiscriminatedUnions = z.infer<
  typeof eventWithDiscriminatedUnions
>;
