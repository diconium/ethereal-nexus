import { projectComponentConfig, projects } from './schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { componentsSchema } from '@/data/components/dto';
import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID of the project
 *         name:
 *           type: string
 *           description: Name of the project
 *         description:
 *           type: string
 *           description: Description of the project
 */
export const projectSchema = createSelectSchema(projects);
export type Project = z.infer<typeof projectSchema>

export const projectComponentConfigSchema = createSelectSchema(projectComponentConfig);
export type ProjectComponentConfig = z.infer<typeof projectComponentConfigSchema>

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectWithComponentId:
 *       allOf:
 *         - $ref: '#/components/schemas/Project'
 *         - type: object
 *           properties:
 *             components:
 *               type: array
 *               description: ID of the project
 *               items:
 *                 type: object
 *                 properties:
 *                   component_id: string
 */
export const projectWithComponentIdSchema = projectSchema
  .extend({
    components: projectComponentConfigSchema
      .pick({ component_id: true })
      .array(),
  });
export type ProjectWithComponentId = z.infer<typeof projectWithComponentIdSchema>

export const projectComponentsSchema = projectSchema
  .pick({ name: true })
  .extend({
    components: z.object({
      component: componentsSchema
    }).array()
  });
export type ProjectComponent = z.infer<typeof projectComponentsSchema>

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the project
 *         description:
 *           type: string
 *           description: Description of the project
 */
export const projectInputSchema = createInsertSchema(projects, {
  name: (schema) =>
    schema.name
      .min(4, 'Name must be longer than 4 characters.')
  })
  .omit({id: true})
  .required({ name: true });
export type ProjectInput = z.infer<typeof projectInputSchema>
