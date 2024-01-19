import { DEFAULT_HEADERS, HttpStatus } from '@/app/api/utils';
import { Component } from '@/data/components/model';

/**
 * @swagger
 * /api/v1/projects/{id}/components/{name}/versions/{version}:
 *   get:
 *     summary: Get a component with a given project, name, and version
 *     description: Get a component with a given project, name, and version
 *     tags:
 *      - Components
 *     produces:
 *      - application/json
 *     parameters:
 *      - in: path
 *        name: id
 *        description: The project id
 *        required: true
 *        type: string
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
  {
    params,
  }: {
    params: Pick<Component, 'name' | 'version'> & { id: string };
  },
) {
  const { id, name, version } = params;

  try {
    // FIXME call action
    // const db = await mongooseDb();
    //
    // const components = await db
    //   .collection(Collection.COMPONENTS)
    //   .aggregate([
    //     { $match: { name, version } },
    //     {
    //       $lookup: {
    //         from: Collection.PROJECTS,
    //         localField: "name",
    //         foreignField: "components",
    //         as: "projects",
    //       },
    //     },
    //     { $match: { "projects._id": new ObjectId(id) } },
    //     {
    //       $project: {
    //         _id: { $toString: "$_id" },
    //         name: 1,
    //         version: 1,
    //         assets: 1,
    //         dialog: 1,
    //       },
    //     },
    //   ])
    //   .toArray();
    const components = [];

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
