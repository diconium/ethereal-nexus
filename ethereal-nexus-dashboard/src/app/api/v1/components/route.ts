import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { upsertComponent } from '@/data/components/actions';

/**
 * @swagger
 * /api/v1/components:
 *   post:
 *     summary: Creates/Updates a project
 *     description: Creates/Updates a project
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
export const POST = authenticatedWithKey(async (request: NextRequest) => {
  const req = await request.json();
  const componentWithVersion = await upsertComponent(req);

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
});
