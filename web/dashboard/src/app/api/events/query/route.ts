import { NextRequest, NextResponse } from 'next/server';
import { queryResourceEvents } from '@/data/events/actions';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { auth } from '@/auth';
import { HttpStatus } from '@/app/api/utils';

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

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      logger.warn('Unauthorized request to events query', { url: req.url });
      return NextResponse.json('You do not have permissions for this resource.', {
        status: HttpStatus.FORBIDDEN,
      });
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch (err) {
      logger.warn('Invalid JSON payload received for events query', { url: req.url });
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsedBody = eventsQuerySchema.safeParse(body);

    if (!parsedBody.success) {
      logger.warn('Events query payload validation failed', {
        url: req.url,
        issues: parsedBody.error.issues,
      });

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
      currentUserId: session.user.id
    };

    logger.info('Executing events query', { url: req.url, queryArgs: { resourceId: parsedBody.data.resourceId, user: session.user.id } });

    const result = await queryResourceEvents(queryArgs);
    if (!result.success) {
      const message = result.error.message;
      const status = message.includes('required') ? 400 : message.includes('not authorized') ? 403 : 500;

      logger.error('queryResourceEvents failed', new Error(message), { url: req.url, status, queryArgs });

      return NextResponse.json({ success: false, error: message }, { status });
    }

    logger.info('Events query succeeded', { url: req.url, resourceId: parsedBody.data.resourceId });

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    logger.error('Unhandled error in events query route', e as Error, { url: req.url });
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
