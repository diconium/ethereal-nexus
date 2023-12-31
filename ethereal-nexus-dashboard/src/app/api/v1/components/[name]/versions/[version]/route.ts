import { NextResponse } from "next/server";
import { DEFAULT_HEADERS, HttpStatus } from "@/app/api/utils";
import mongooseDb, { Collection } from "@/lib/mongodb";
import { Component } from "@/app/api/v1/components/model";

/**
 * @swagger
 * /api/v1/components/{name}/versions/{version}:
 *   get:
 *     summary: Get a component with a given name and version
 *     description: Get a component with a given name and version
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     parameters:
 *      - in: path
 *        name: name
 *        description: The component's name
 *        required: true
 *        type: string
 *      - in: path
 *        name: version
 *        description: The component's version
 *        required: true
 *        type: string
 *     responses:
 *      '200':
 *        description: The component's info
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
  { params }: { params: Pick<Component, "name" | "version"> },
) {
  const { name, version } = params;

  try {
    const db = await mongooseDb();

    const components = await db
      .collection(Collection.COMPONENTS)
      .find({ name, version })
      .toArray();

    return new Response(JSON.stringify(components), {
      status: HttpStatus.OK,
      headers: DEFAULT_HEADERS,
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({}), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  }
}
