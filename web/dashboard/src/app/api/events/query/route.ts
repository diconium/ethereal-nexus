import { NextResponse } from 'next/server';
import { queryResourceEvents } from '@/data/events/actions';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';

const optionalString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalDateString = optionalString.refine(
  (value) => value === undefined || !Number.isNaN(Date.parse(value)),
  'Invalid date',
);

const eventsQuerySchema = z.object({
  resourceId: z.string().uuid(),
  pageIndex: z.coerce.number().int().min(0).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  userId: optionalString,
  componentId: optionalString,
  projectId: optionalString,
  type: optionalString,
  startDate: optionalDateString,
  endDate: optionalDateString,
  sortField: z
    .enum(['timestamp', 'type', 'user', 'component', 'project'])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  globalFilter: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    const parsedBody = eventsQuerySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query payload',
          issues: parsedBody.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const queryArgs = {
      ...parsedBody.data,
      currentUserId: token.sub,
    };
    const result = await queryResourceEvents(queryArgs);
    if (!result.success) {
      const message = result.error.message;
      const status = message.includes('required')
        ? 400
        : message.includes('not authorized')
          ? 403
          : 500;

      return NextResponse.json({ success: false, error: message }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 },
    );
  }
}
