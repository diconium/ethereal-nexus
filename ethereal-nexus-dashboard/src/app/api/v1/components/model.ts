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
 *         version:
 *           type: string
 *           description: Version of the component
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
export interface Component {
  _id?: string;
  name: string;
  version: string;
  assets: ComponentAsset[];
  dialog: ComponentDialogProperty[];
}

export type ProjectComponent = Pick<Component, 'name' | 'version'>;

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
 *         filePath:
 *           type: string
 *           description: Path to the asset
 */
export interface ComponentAsset {
  type: string;
  filePath: string;
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
