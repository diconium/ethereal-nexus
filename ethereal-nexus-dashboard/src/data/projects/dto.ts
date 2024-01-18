import { createSelectSchema } from 'drizzle-zod';
import { projectComponentConfig, projects, projectsRelations } from './schema';
import { members } from '@/data/member/schema';
import { memberSchema } from '@/data/member/dto';

export const projectSchema = createSelectSchema(projects)

export const projectComponentConfigSchema = createSelectSchema(projectComponentConfig)

export const projectWithComponentSchema = projectSchema.extend({
  components: projectComponentConfigSchema.pick({component_id: true}).array(),
  members: memberSchema.pick({user_id: true}).array(),
})