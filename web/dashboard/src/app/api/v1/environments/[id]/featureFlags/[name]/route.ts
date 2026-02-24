import { NextResponse } from 'next/server';
import { db } from '@/db';
import { featureFlags } from '@/data/projects/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; name: string }> },
) {
  const { id: environment_id, name: flag_name } = await params;
  const body = await req.json();
  const { project_id, component_id, enabled, description } = body;

  if (
    !project_id ||
    !component_id ||
    typeof enabled !== 'boolean' ||
    typeof description !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing required fields.' },
      { status: 400 },
    );
  }

  // Try to find existing flag
  const existing = await db
    .select()
    .from(featureFlags)
    .where(
      and(
        eq(featureFlags.environment_id, environment_id),
        eq(featureFlags.project_id, project_id),
        eq(featureFlags.component_id, component_id),
        eq(featureFlags.flag_name, flag_name),
      ),
    );

  let result;
  if (existing.length > 0) {
    // Update existing flag
    result = await db
      .update(featureFlags)
      .set({ enabled, description })
      .where(
        and(
          eq(featureFlags.environment_id, environment_id),
          eq(featureFlags.project_id, project_id),
          eq(featureFlags.component_id, component_id),
          eq(featureFlags.flag_name, flag_name),
        ),
      )
      .returning();
  } else {
    // Create new flag
    result = await db
      .insert(featureFlags)
      .values({
        environment_id,
        project_id,
        component_id,
        flag_name,
        enabled,
        description,
      })
      .returning();
  }

  return NextResponse.json({ success: true, flag: result[0] });
}
