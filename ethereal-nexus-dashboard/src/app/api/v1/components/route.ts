import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { authenticatedWithKey } from '@/lib/route-wrappers';
import { upsertComponent } from '@/data/components/actions';
import {revalidatePath} from "next/cache";

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
  console.log(permissions)
  if (permissions?.['components'] !== 'write') {
    return NextResponse.json('You do not have permissions to write this resource.', {
      status: HttpStatus.FORBIDDEN,
    });
  }

  const componentWithVersion = await upsertComponent(req);

  if (!componentWithVersion.success) {
    return NextResponse.json(componentWithVersion.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }
  return NextResponse.json(componentWithVersion.data);
});
