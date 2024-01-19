import { NextResponse } from 'next/server';
import { DEFAULT_HEADERS, HttpStatus } from '@/app/api/utils';
import { getAllProjects } from '@/lib/projects/projects.service';

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Get a list of projects
 *     description: Return all projects
 *     tags:
 *      - Projects
 *     produces:
 *      - application/json
 *     responses:
 *      '200':
 *        description: The list of projects
 *        content:
 *         application/json:
 *          schema:
 *           type: array<Project>
 *           items:
 *            $ref: '#/components/schemas/Project'
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
    const projects = await getAllProjects();
    return new Response(JSON.stringify(projects), {
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
 * /api/v1/projects:
 *   put:
 *     summary: Creates a new project
 *     description: Creates a new project
 *     tags:
 *      - Projects
 *     produces:
 *      - application/json
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
export async function PUT(request: Request) {
  const { name, components = [] } = await request.json();

  if (!name) {
    return new Response(
      JSON.stringify({ message: 'Bad Request - Invalid input data' }),
      {
        status: HttpStatus.BAD_REQUEST,
        headers: DEFAULT_HEADERS,
      },
    );
  }
  // FIXME call action
  // const db = await mongooseDb();
  // // Fixme
  // const result: any = await db
  //   .collection(Collection.PROJECTS)
  //   .insertOne({ name, components: components });
  const result = { ok: true };
  if (result.ok) {
    return new Response(
      JSON.stringify({ message: 'Project created successfully' }),
      {
        status: HttpStatus.OK,
        headers: DEFAULT_HEADERS,
      },
    );
  } else {
    return new Response(
      JSON.stringify({ message: 'Failed to create project.' }),
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        headers: DEFAULT_HEADERS,
      },
    );
  }
}
