import { DEFAULT_HEADERS, HttpStatus } from "@/app/api/utils";
import mongooseDb, { Collection } from "@/lib/mongodb";
import { Component } from "@/app/api/v1/components/model";

/**
 * @swagger
 * /api/v1/components/{name}:
 *   get:
 *     summary: Get a component by ID
 *     description: Get a component by ID
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     parameters:
 *      - name: id
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
export async function GET(
  request: Request,
  { params }: { params: Pick<Component, "name"> },
) {
  const { name } = params;

  try {
    const db = await mongooseDb();

    const latestComponent = await db
      .collection(Collection.COMPONENTS)
      .find({ name })
      .sort({ version: -1 })
      .limit(1)
      .next();

    return new Response(JSON.stringify(latestComponent), {
      status: HttpStatus.OK,
      headers: DEFAULT_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify(null), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  }
}

/**
 * @swagger
 * /api/v1/components/{name}:
 *   head:
 *     summary: Check whether component with the given ID exists
 *     description: Check whether component with the given ID exists
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     parameters:
 *      - name: name
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
 *             example: Component not found
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
export async function HEAD(
  request: Request,
  { params }: { params: Pick<Component, "name"> },
) {
  const { name } = params;

  try {
    const db = await mongooseDb();

    const exists = await db
      .collection(Collection.COMPONENTS)
      .countDocuments({ name });

    if (exists) {
      return new Response(JSON.stringify({}), {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      });
    } else {
      return new Response(JSON.stringify(null), {
        status: HttpStatus.NOT_FOUND,
        headers: DEFAULT_HEADERS,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify(null), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  }
}

/**
 * @swagger
 * /api/v1/components/{name}:
 *   delete:
 *     summary: Delete component with the given name
 *     tags:
 *      - Components
 *     parameters:
 *      - in: path
 *        name: name
 *        description: The component's name
 *        required: true
 *        type: string
 *     responses:
 *      '204':
 *        description: No content
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
 *             example: Component not found
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
export async function DELETE(
  request: Request,
  { params }: { params: Pick<Component, "name"> },
) {
  const { name } = params;

  try {
    const db = await mongooseDb();

    await db.collection(Collection.COMPONENTS).findOneAndDelete({ name });

    return new Response(null, {
      status: HttpStatus.NO_CONTENT,
      headers: DEFAULT_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify(null), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  }
}
