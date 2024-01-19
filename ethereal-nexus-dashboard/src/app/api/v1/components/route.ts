import { NextResponse } from 'next/server';
import { DEFAULT_HEADERS, HttpStatus } from '@/app/api/utils';

/**
 * @swagger
 * /api/v1/components:
 *   get:
 *     summary: Get a list of components
 *     description: Return all components
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     responses:
 *      '200':
 *        description: The list of components
 *        content:
 *         application/json:
 *          schema:
 *           type: array
 *           items:
 *            $ref: '#/components/schemas/Component'
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
export async function GET() {
  try {
    const components = [];
    return new Response(JSON.stringify(components), {
      status: HttpStatus.OK,
      headers: DEFAULT_HEADERS,
    });
  } catch (e) {
    console.error(e);
  }

  return NextResponse.json({ components: [] });
}

/**
 * @swagger
 * /api/v1/components:
 *   put:
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
export async function PUT(request: Request) {
  const { name, version, dialog, title } = await request.json();
  const query = {
    name,
    version,
  };

  // FIXME: Call create and update action
  // const db = await mongooseDb();
  // const result = await db.collection(Collection.COMPONENTS).findOneAndUpdate(
  //   query,
  //   { $set: {name , version, dialog, title}}, // The document to insert or update
  //   { upsert: true },
  // );
  const result = { ok: true };

  if (result.ok) {
    return new Response(
      JSON.stringify({ message: 'Document updated successfully' }),
      {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      },
    );
  } else {
    return new Response(
      JSON.stringify({ message: 'Failed to insert record.' }),
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        headers: DEFAULT_HEADERS,
      },
    );
  }
}
