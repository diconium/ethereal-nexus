import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getEnvironmentsByProject } from '@/data/projects/actions';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await getEnvironmentsByProject(id);

  if (!result.success) {
    const status = result.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      { environments: [], error: result.error.message },
      { status },
    );
  }

  return NextResponse.json({ environments: result.data ?? [] });
}
