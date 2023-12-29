/**
 * @swagger
 * components:
 *   schemas:
 *     Component:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the component
 *         versions:
 *           type: string[]
 *           description: Versions of the component
 *         assets:
 *           type: array
 *           description: List of assets necessary to render the component
 *           items:
 *            $ref: '#/components/schemas/ComponentAsset'
 *         dialog:
 *            type: array
 *            description: List of authoring dialog properties
 *            items:
 *             $ref: '#/components/schemas/ComponentDialogProperty'
 */
export interface ComponentWithVersions {
  _id?: string;
  name: string;
  versions: string[];
  assets: ComponentAsset[];
  dialog: ComponentDialogProperty[];
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ComponentAsset:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: Type of the asset (js, css, ...)
 *         path:
 *           type: string
 *           description: Path to the asset
 */
export interface ComponentAsset {
  type: string;
  path: string;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ComponentDialogProperty:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: Type of the dialog property
 *         placeholder:
 *           type: string
 *           description: Configuration input placeholder
 *         label:
 *           type: string
 *           description: Configuration input label
 *         id:
 *           type: string
 *           description: Configuration input id
 */
export interface ComponentDialogProperty {
  type: string;
  placeholder: string;
  label: string;
  id: string;
}
