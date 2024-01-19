import { DEFAULT_HEADERS, HttpStatus } from '@/app/api/utils';
import { Component } from '@/data/components/model';

/**
 * @swagger
 * /api/v1/projects/{id}/components/{name}:
 *   get:
 *     summary: Get a component by name and project
 *     description: Get a component by name and assigned project, listing all its versions
 *     tags:
 *      - Components
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
export async function GET(
  request: Request,
  { params }: { params: Pick<Component, 'name'> & { id: string } },
) {
  const { name, id } = params;

  try {
    // FIXME call action
    // const db = await mongooseDb();
    //
    // const latestComponent = await db
    //   .collection(Collection.COMPONENTS)
    //   .aggregate([
    //     { $match: { name } },
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
    //   .sort({ version: -1 })
    //   .limit(1)
    //   .next();
    const latestComponent = {};

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
