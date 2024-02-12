import { HttpStatus } from '@/app/api/utils';
import { getProjectComponents } from '@/data/projects/actions';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/v1/projects/{id}/components:
 *   get:
 *     summary: Get a project's components
 *     description: Get the components linked to a project
 *     tags:
 *      - Projects
 *     produces:
 *      - application/json
 *     parameters:
 *      - in: path
 *        name: id
 *        description: The project's ID
 *        required: true
 *        type: string
 *     responses:
 *      '200':
 *        description: The project info
 *        content:
 *         application/json:
 *          schema:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/Component'
 *      '404':
 *        description: Not Found
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Not Found - the project does not exist
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
  async (request, ext: { params: { id: string } } | undefined) => {
    const { id } = ext?.params || { id: undefined };
    const userId = request.user.id;

    const response = await getProjectComponents(id, userId);

    if (!response.success) {
      return NextResponse.json(response.error, {
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return NextResponse.json(response.data, { status: HttpStatus.OK });
  },
);
