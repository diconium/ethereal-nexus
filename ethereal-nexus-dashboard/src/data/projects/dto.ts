import { projectComponentConfig, projects, projectsRelations } from './schema';
import { members } from '@/data/member/schema';
import { memberSchema } from '@/data/member/dto';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { componentsSchema } from '@/data/components/dto';
import { z } from 'zod';

export const projectSchema = createSelectSchema(projects);

export const projectComponentConfigSchema = createSelectSchema(projectComponentConfig);

export const projectWithComponentSchema = projectSchema.extend({
  components: projectComponentConfigSchema.pick({ component_id: true }).array(),
  members: memberSchema.pick({ user_id: true }).array()
});

export const projectComponentsSchema = projectSchema
  .pick({ name: true })
  .extend({
    components: z.object({
      component: componentsSchema
    }).array()
  });

export const newProjectSchema = createInsertSchema(projects, {
  name: (schema) =>
    schema.name.min(4, 'Name must be longer than 4 characters.')
})
  .required({ name: true });