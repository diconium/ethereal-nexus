import { NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { getProjects, insertProject } from '@/data/projects/actions';
import { auth } from '@/auth';

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
  const session = await auth()
  const projects = await getProjects(session?.user?.id);
  if (!projects.success) {
    return NextResponse.json(projects.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  return NextResponse.json(projects.data, {
    status: HttpStatus.OK,
  });
}

/**
 * @swagger
 * /api/v1/projects:
 *   post:
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
 *           description:
 *            type: string
 *            description: Projects brief description
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
export async function POST(request: Request) {
  const req = await request.json();
  const project = await insertProject(req);

  if (!project.success) {
    return NextResponse.json(project.error, { status: HttpStatus.BAD_REQUEST });
  }

  return NextResponse.json(project.data);
}
