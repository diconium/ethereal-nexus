import { Component } from '@/app/api/v1/components/model';

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the component
 *         description:
 *           type: string
 *           description: Description of the component
 *         components:
 *           description: Array of project names
 *           type: array
 *           items:
 *            type: string
 *            example: ["componentA", "componentB", "componentC"]
 */
export interface Project {
  _id?: any;
  name: string;
  description?: string;
  components: string[] | Component[];
}
