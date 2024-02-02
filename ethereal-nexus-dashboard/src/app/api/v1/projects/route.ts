import { NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { getProjects, getProjectsWithComponents, insertProject } from '@/data/projects/actions';
import { authenticatedWithKey, DefaultExt } from '@/lib/route-wrappers';
import { UserId } from '@/data/users/dto';

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
 *           type: array
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
export const GET = authenticatedWithKey<DefaultExt & {user: UserId}>(async (_req, ext) => {
  const projects = await getProjectsWithComponents(ext?.user?.id);
  if (!projects.success) {
    return NextResponse.json(projects.error, {
      status: HttpStatus.BAD_REQUEST,
    });
  }

  return NextResponse.json(projects.data, {
    status: HttpStatus.OK,
  });
})

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
 *           $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *      '200':
 *        description: Success message
 *        content:
 *         application/json:
 *          schema:
 *            $ref: '#/components/schemas/Project'
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
export const POST = authenticatedWithKey<DefaultExt & {user: UserId}>(async (request, ext)=> {
  const json = await request.json();
  const project = await insertProject(json, ext?.user.id);

  if (!project.success) {
    return NextResponse.json(project.error, { status: HttpStatus.BAD_REQUEST });
  }

  return NextResponse.json(project.data);
})
