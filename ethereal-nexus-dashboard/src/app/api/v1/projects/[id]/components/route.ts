import { DEFAULT_HEADERS, HttpStatus } from '@/app/api/utils';
import { getProjectComponents } from '@/data/projects/actions';
import { authenticatedWithKey, DefaultExt } from '@/lib/route-wrappers';
import { UserId } from '@/data/users/dto';

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
export const GET = authenticatedWithKey<DefaultExt & {user: UserId}>(async (_req, ext) => {
  const { id } = ext?.params as {id: string};

  try {
    const project = await getProjectComponents(id, ext?.user?.id);

    if (!project.success) {
      return new Response(
        JSON.stringify({ message: project.error.message }),
        {
          status: HttpStatus.BAD_REQUEST,
          headers: DEFAULT_HEADERS,
        },
      );
    }

    return new Response(
      JSON.stringify(
        project.data,
      ),
      {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: `Failed to get project with the given id` }),
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        headers: DEFAULT_HEADERS,
      },
    );
  }
})

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   head:
 *     summary: Check whether project with the given ID exists
 *     description: Check whether project with the given ID exists
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
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Project exists
 *      '404':
 *        description: Not Found
 *        content:
 *         application/json:
 *          schema:
 *           type: object
 *           properties:
 *            message:
 *             type: string
 *             example: Project not found
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
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    // FIXME call action
    // const db = await mongooseDb();
    //
    // const exists = await db
    //   .collection(Collection.COMPONENTS)
    //   .countDocuments({ _id: new ObjectId(id) });
    const exists = false;

    if (exists) {
      return new Response(JSON.stringify({ message: 'Project Found' }), {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      });
    } else {
      return new Response(JSON.stringify({ message: 'Project not found' }), {
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
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update an existing project
 *     description: Update an existing project
 *     tags:
 *      - Projects
 *     produces:
 *      - application/json
 *     parameters:
 *      - name: id
 *        description: The project's ID
 *        required: true
 *        type: string
 *     requestBody:
 *      required: true
 *      content:
 *       application/json:
 *         schema:
 *          type: object
 *          properties:
 *           name:
 *            type: string
 *            description: Name of the project
 *           components:
 *            type: array
 *            items:
 *             type: string
 *             description: List of components that can be used inside the given project
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
 *             example: Resource created successfully
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
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  // FIXME call action
  // const db = await mongooseDb();
  // const { id } = params;
  //
  // const project = await request.json();
  //
  // const result = await db
  //   .collection(Collection.PROJECTS)
  //   .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: project });
  const result = { ok: false };

  if (result.ok) {
    return new Response(
      JSON.stringify({ message: 'Project updated successfully' }),
      {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      },
    );
  } else {
    return new Response(
      JSON.stringify({ message: 'Failed to update project.' }),
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        headers: DEFAULT_HEADERS,
      },
    );
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
 *      - name: name
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
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    // FIXME call action
    // const db = await mongooseDb();
    //
    // let result = await db
    //   .collection(Collection.PROJECTS)
    //   .findOneAndDelete({ _id: new ObjectId(id) });
    const result = { ok: false };

    return new Response(null, {
      status: result.ok
        ? HttpStatus.NO_CONTENT
        : HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify(null), {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: DEFAULT_HEADERS,
    });
  }
}
