import { NextResponse } from 'next/server';
import { getProjects } from '@/data/projects/actions';

export async function GET() {
  const result = await getProjects();

  if (!result.success) {
    const status = result.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      {
        projects: [],
        error: result.error.message ?? 'Unable to load projects',
      },
      { status },
    );
  }

  return NextResponse.json({ projects: result.data ?? [] });
}
