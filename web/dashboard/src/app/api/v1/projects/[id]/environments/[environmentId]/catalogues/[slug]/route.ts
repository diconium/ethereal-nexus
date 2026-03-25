import { NextResponse } from 'next/server';
import { authenticatedWithApiKeyUser, HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import {
  projectAiCatalogues,
  projectAiCatalogueVersions,
} from '@/data/ai/schema';
import { and, desc, eq } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{
    id: string;
    environmentId: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: projectId, environmentId, slug } = await context.params;
  const user = await authenticatedWithApiKeyUser();

  if (!user?.id) {
    return NextResponse.json(
      { error: 'API credentials are required.' },
      { status: HttpStatus.UNAUTHORIZED },
    );
  }

  if (user.permissions?.[projectId] === 'none') {
    return NextResponse.json(
      { error: 'You do not have permissions for this resource.' },
      { status: HttpStatus.FORBIDDEN },
    );
  }

  const catalogueRows = await db
    .select()
    .from(projectAiCatalogues)
    .where(
      and(
        eq(projectAiCatalogues.project_id, projectId),
        eq(projectAiCatalogues.environment_id, environmentId),
        eq(projectAiCatalogues.slug, slug),
      ),
    )
    .limit(1);

  const catalogue = catalogueRows[0];
  if (!catalogue) {
    return NextResponse.json(
      { error: 'Catalogue not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  const versions = await db
    .select()
    .from(projectAiCatalogueVersions)
    .where(eq(projectAiCatalogueVersions.catalogue_id, catalogue.id))
    .orderBy(desc(projectAiCatalogueVersions.created_at))
    .limit(1);

  return NextResponse.json({
    catalogue,
    data: versions[0]?.data || { items: [], facets: {} },
  });
}
