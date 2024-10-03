import { HttpStatus } from '@/app/api/utils';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { NextResponse } from 'next/server';
import { getEnvironmentComponentConfig, getProjectComponentConfig } from '@/data/projects/actions';

/**
 * @swagger
 * /api/v1/projects/{id}/components/{name}:
 *   get:
 *     summary: Get a component by name and project
 *     description: Get a component by name and assigned project, listing all its versions
 *     tags:
 *      - Projects
 *     produces:
 *      - application/json
 *     parameters:
 *      - in: path
 *        name: id
 *        description: The project's id
 *        required: true
 *        type: string
 *      - in: path
 *        name: name
 *        description: The component's name
 *        required: true
 *        type: string
 *     responses:
 *      '200':
 *        description: The component info
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           $ref: '#/components/schemas/Component'
 *      '404':
 *        description: Not Found
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Not Found - the component does not exist
 *      '500':
 *        description: Internal Server Error
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Internal Server Error - Something went wrong on the server side
 */
export const GET = authenticatedWithKey(
  async (
    _,
    ext: { params: { id: string; name: string }; user } | undefined,
  ) => {
    const { id, name } = ext?.params || { id: undefined, name: undefined };
    if (!id) {
      return NextResponse.json('No identifier provided.', {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const userId = ext?.user.id;
    if (!userId) {
      return NextResponse.json('Api key not provided or invalid.', {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const permissions = ext?.user.permissions;
    if (permissions[id] === 'none') {
      return NextResponse.json('You do not have permissions for this resource.', {
        status: HttpStatus.FORBIDDEN,
      });
    }

    const response = await getEnvironmentComponentConfig(id, name, userId);

    if (!response.success) {
      return NextResponse.json(response.error, {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return NextResponse.json(response.data, { status: HttpStatus.OK });
  },
);
