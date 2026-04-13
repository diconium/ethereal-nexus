import { desc, eq, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { normalizeCatalogueApiPath } from '@/data/ai/catalogue-endpoint';
import {
  projectAiCatalogues,
  projectAiCatalogueVersions,
} from '@/data/ai/schema';
import { logger } from '@/lib/logger';

const EMPTY = { items: [], facets: {} };

type RouteContext = {
  params: Promise<{
    catalogueSlug: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { catalogueSlug } = await context.params;
  const apiPath = `/api/v1/${catalogueSlug}`;

  logger.debug('Public catalogue v1 API request received', {
    route: 'catalogue-public-v1-api',
    catalogueSlug,
    apiPath,
  });

  const catalogueRows = await db
    .select()
    .from(projectAiCatalogues)
    .where(
      or(
        eq(projectAiCatalogues.api_url, apiPath),
        eq(projectAiCatalogues.slug, catalogueSlug),
      ),
    )
    .limit(1);

  const catalogue = catalogueRows[0];
  if (!catalogue) {
    logger.warn('Public catalogue v1 API target not found', {
      route: 'catalogue-public-v1-api',
      catalogueSlug,
      apiPath,
    });
    return NextResponse.json(
      { error: 'Catalogue not found.' },
      { status: 404 },
    );
  }

  const versions = await db
    .select()
    .from(projectAiCatalogueVersions)
    .where(eq(projectAiCatalogueVersions.catalogue_id, catalogue.id))
    .orderBy(desc(projectAiCatalogueVersions.created_at))
    .limit(1);

  logger.info('Public catalogue v1 API response served', {
    route: 'catalogue-public-v1-api',
    catalogueSlug,
    catalogueId: catalogue.id,
    normalizedApiPath: normalizeCatalogueApiPath(
      catalogue.api_url,
      catalogue.slug,
    ),
    hasVersion: Boolean(versions[0]),
    itemCount: versions[0]?.data?.items?.length ?? 0,
  });

  return NextResponse.json(versions[0]?.data || EMPTY);
}
