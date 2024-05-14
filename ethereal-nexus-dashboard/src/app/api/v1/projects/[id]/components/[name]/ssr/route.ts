import {HttpStatus} from '@/app/api/utils';
import {authenticatedWithKey} from '@/lib/route-wrappers';
import {NextResponse} from 'next/server';
import {getProjectComponentConfig} from '@/data/projects/actions';
import {callSSR} from "@/lib/ssr/ssr";

/**
 * @swagger
 * /api/v1/projects/{id}/components/{name}/ssr:
 *   post:
 *     summary: Returns component SSR output
 *     description: Returns component SSR output based on the props sent as json body
 *     tags:
 *      - Projects
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
 *        description: The SSR component
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
export const POST = authenticatedWithKey(
    async (
        request,
        ext: { params: { id: string; name: string }; user } | undefined,
    ) => {
        const {id, name} = ext?.params || {id: undefined, name: undefined};
        if (!id) {
            return NextResponse.json('No identifier provided.', {
                status: HttpStatus.BAD_REQUEST,
            });
        }

        const userId = ext?.user.id;
        if (!userId) {
            return NextResponse.json('Api key not provided or invalid.', {
                status: HttpStatus.BAD_REQUEST,
            });
        }

        const permissions = ext?.user.permissions;
        if (permissions[id] === 'none') {
            return NextResponse.json('You do not have permissions for this resource.', {
                status: HttpStatus.FORBIDDEN,
            });
        }

        const response = await getProjectComponentConfig(id, name, userId);

        const req = await request.json();

        if (!response.success) {
            return NextResponse.json(response.error, {
                status: HttpStatus.BAD_REQUEST,
            });
        }
        const {output, serverSideProps } = await callSSR(response.data.name, req, response.data.assets)

        return NextResponse.json({output, serverSideProps}, { status: HttpStatus.OK });


    },
);
