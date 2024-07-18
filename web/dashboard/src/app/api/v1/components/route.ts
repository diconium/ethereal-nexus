import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { getComponents, upsertComponentWithVersion } from '@/data/components/actions';

/**
 * @swagger
 * /api/v1/components:
 *   post:
 *     summary: Creates/Updates a component
 *     description: Creates/Updates a component
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     requestBody:
 *      required: true
 *      content:
 *       application/json:
 *         schema:
 *          type: object
 *          $ref: '#/components/schemas/Component'
 *     responses:
 *      '200':
 *        description: Success message
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Component created successfully
 *      '400':
 *        description: Bad Request
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Bad Request - Invalid input data
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
export const POST = authenticatedWithKey(async (request: NextRequest, ext) => {
  const req = await request.json();

  const permissions = ext?.user.permissions;
  if (permissions?.['components'] !== 'write') {
    return NextResponse.json('You do not have permissions to write this resource.', {
      status: HttpStatus.FORBIDDEN,
    });
  }
  const componentWithVersion = await upsertComponentWithVersion(req, ext?.user.id);

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
});

/**
 * @swagger
 * /api/v1/components:
 *   get:
 *     summary: Get all components
 *     description: Get a list of all components
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     requestBody:
 *      required: true
 *      content:
 *       application/json:
 *         schema:
 *          type: object
 *          $ref: '#/components/schemas/Component'
 *     responses:
 *      '200':
 *        description: All components
 *        content:
 *         application/json:
 *          schema:
 *           type: array
 *           items:
 *           $ref: '#/components/schemas/Component'
 *      '400':
 *        description: Bad Request
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Bad Request - Invalid input data
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
export const GET = authenticatedWithKey(async (request: NextRequest, ext) => {

  const permissions = ext?.user.permissions;
  if (permissions?.['components'] !== 'read' && permissions?.['components'] !== 'write') {
    return NextResponse.json('You do not have permissions to write this resource.', {
      status: HttpStatus.FORBIDDEN,
    });
  }

  const componentWithVersion = await getComponents();

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
});
