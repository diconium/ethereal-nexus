import { NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import {
  projectAiCatalogues,
  projectAiCatalogueVersions,
} from '@/data/ai/schema';
import { and, desc, eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{
    id: string;
    environmentId: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id: projectId, environmentId, slug } = await context.params;
  logger.debug('Public catalogue API request received', {
    route: 'catalogue-public-api',
    projectId,
    environmentId,
    slug,
  });

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
    logger.warn('Public catalogue API target not found', {
      route: 'catalogue-public-api',
      projectId,
      environmentId,
      slug,
    });
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

  logger.info('Public catalogue API response served', {
    route: 'catalogue-public-api',
    projectId,
    environmentId,
    slug,
    catalogueId: catalogue.id,
    hasVersion: Boolean(versions[0]),
    itemCount: versions[0]?.data?.items?.length ?? 0,
  });

  return NextResponse.json({
    catalogue: {
      slug: catalogue.slug,
      name: catalogue.name,
      description: catalogue.description,
      show_in_sidebar: catalogue.show_in_sidebar,
      updated_at: catalogue.updated_at,
    },
    data: versions[0]?.data || { items: [], facets: {} },
  });
}
