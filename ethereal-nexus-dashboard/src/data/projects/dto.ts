import { projectComponentConfig, projects } from './schema';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  componentAssetsSchema,
  componentsSchema,
  componentVersionsSchema
} from '@/data/components/dto';
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
export type Project = z.infer<typeof projectSchema>;

export const projectComponentConfigSchema = createSelectSchema(
  projectComponentConfig,
);
export type ProjectComponentConfig = z.infer<
  typeof projectComponentConfigSchema
>;

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
export const projectWithComponentIdSchema = projectSchema.extend({
  components: projectComponentConfigSchema.pick({ component_id: true }).array(),
});
export type ProjectWithComponentId = z.infer<
  typeof projectWithComponentIdSchema
>;

export const projectWithComponentSchema = projectSchema.extend({
  components: projectComponentConfigSchema
    .pick({
      is_active: true,
      component_version: true,
    })
    .extend({
      component: componentsSchema,
      version: componentVersionsSchema,
    })
    .transform((val) => ({
      ...val.component,
      isActive: val.is_active,
      version: {
        ...val.version,
        component_id: undefined,
      },
    }))
    .array(),
});
export type ProjectWithComponent = z.infer<typeof projectWithComponentSchema>;

export const projectWithComponentAssetsSchema = componentsSchema
  .pick({ id: true, name: true, title: true })
  .extend({
    version: componentVersionsSchema.shape.version,
    dialog: componentVersionsSchema.shape.dialog,
    assets: z.array(
      componentAssetsSchema
        .pick({url: true, id: true, type: true})
        .transform(val => ({
            ...val,
            url: undefined,
            filePath: val.url
          })
        )),
  })

export const projectComponentsSchema = componentsSchema.extend({
  is_active: projectComponentConfigSchema.shape.is_active.nullable(),
  version: componentVersionsSchema.shape.version.nullable(),
  versions: componentVersionsSchema.pick({id: true, version: true}).array(),
});
export type ProjectComponent = z.infer<typeof projectComponentsSchema>;

export const projectComponentsWithDialogSchema = projectComponentsSchema
  .omit({versions: true})
  .extend(
    {
      dialog: componentVersionsSchema.shape.dialog.nullable(),
    },
  );
export type ProjectComponentsWithDialog = z.infer<
  typeof projectComponentsWithDialogSchema
>;

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
    schema.name.min(4, 'Name must be longer than 4 characters.'),
})
  .required({ name: true });
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectComponentConfigInputSchema = createInsertSchema(
  projectComponentConfig,
);
export type ProjectComponentConfigInput = z.infer<
  typeof projectComponentConfigInputSchema
>;
