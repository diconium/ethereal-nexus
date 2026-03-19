import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getEnvironmentsByProject } from '@/data/projects/actions';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { HttpStatus } from '@/app/api/utils';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await getEnvironmentsByProject(id);

  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    logger.warn('Unauthorized request to get projects', { url: _request.url });
    return NextResponse.json('You do not have permissions for this resource.', {
      status: HttpStatus.FORBIDDEN,
    });
  }

  if (!result.success) {
    const status = result.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      { environments: [], error: result.error.message },
      { status },
    );
  }

  return NextResponse.json({ environments: result.data ?? [] });
}
