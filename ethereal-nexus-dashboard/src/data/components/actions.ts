import { ActionResponse, Result } from '@/data/action';
import { z } from 'zod';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { db } from '@/db';

import {
  Component,
  componentAssetsCreateSchema,
  componentAssetsSchema,
  componentsSchema,
  componentsUpsertSchema,
  componentsWithVersions,
  ComponentToUpsert,
  ComponentVersion,
  componentVersionsCreateSchema,
  componentVersionsSchema,
  ComponentWithVersion,
} from './dto';
import { and, eq } from 'drizzle-orm';
import { componentAssets, components, componentVersions } from '@/data/components/schema';

export async function upsertComponent(
  component: ComponentToUpsert,
): Promise<Result<ComponentWithVersion>> {
  const safeComponent = componentsUpsertSchema.safeParse(component);
  if (!safeComponent.success) {
    return actionZodError(
      "There's an issue with the component record.",
      safeComponent.error,
    );
  }
  try {
    const select: Component | undefined = await db.query.components.findFirst({
      where: eq(components.name, safeComponent.data.name),
    });

    let upsertedComponent: Component | undefined = select;
    // Insert component whether it does not exist yet
    if (!select?.id) {
      const insertComponentResult = await db
        .insert(components)
        .values(safeComponent.data)
        .returning();

      const insertedComponent = componentsSchema.safeParse(
        insertComponentResult[0],
      );
      if (!insertedComponent.success) {
        return actionZodError(
          "There's an issue with the inserted component record.",
          insertedComponent.error,
        );
      }
      upsertedComponent = insertedComponent.data;
    }

    if (!upsertedComponent) {
      return actionError('Failed to fetch or update component');
    }

    let upsertedVersion: ComponentVersion;
    const versionToUpsert = {
      component_id: upsertedComponent.id,
      version: component.version,
      dialog: component.dialog,
    };

    const safeComponentVersion =
      componentVersionsCreateSchema.safeParse(versionToUpsert);

    if (!safeComponentVersion.success) {
      return actionZodError(
        "There's an issue with the component version record.",
        safeComponentVersion.error,
      );
    }

    const selectVersion = await db.query.componentVersions.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(componentVersions.component_id, upsertedComponent.id),
        eq(componentVersions.version, safeComponentVersion.data.version),
      ),
    });

    if (!selectVersion?.id) {
      const insertVersionResult = await db
        .insert(componentVersions)
        .values(safeComponentVersion.data)
        .returning();

      const insertedVersion = componentVersionsSchema.safeParse(
        insertVersionResult[0],
      );

      if (!insertedVersion.success) {
        return actionZodError(
          "There's an issue with the inserted component version record.",
          insertedVersion.error,
        );
      }
      upsertedVersion = insertedVersion.data;
    } else {
      const updateVersionResult = await db
        .update(componentVersions)
        .set(safeComponentVersion.data)
        .where(eq(componentVersions.id, selectVersion.id))
        .returning();

      const updatedVersion = componentVersionsSchema.safeParse(
        updateVersionResult[0],
      );
      if (!updatedVersion.success) {
        return actionZodError(
          'There was an issue updating the components version.',
          updatedVersion.error,
        );
      }
      upsertedVersion = updatedVersion.data;
    }

    return actionSuccess({
      ...upsertedComponent,
      version: upsertedVersion,
    });
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert component into database.');
  }
}

export async function updateAssets(
  componentName: string,
  versionId: string,
  url: string,
  contentType: 'css' | 'js' | null,
) {
  try {
    const selectComponentVersion = await db.query.components.findFirst({
      columns: {
        id: true,
      },
      with: {
        versions: {
          where: eq(componentVersions.version, versionId),
        },
      },
      where: eq(components.name, componentName),
    });

    if (
      !selectComponentVersion?.id ||
      !selectComponentVersion.versions?.length
    ) {
      return actionError(
        `Failed to fetch component with name ${componentName}.`,
      );
    }

    const assetToUpsert: z.infer<typeof componentAssetsCreateSchema> = {
      component_id: selectComponentVersion.id,
      version_id: selectComponentVersion.versions[0].id!,
      url,
      type: contentType,
    };

    const safeAssetToUpsert =
      componentAssetsCreateSchema.safeParse(assetToUpsert);

    if (!safeAssetToUpsert.success) {
      return actionZodError(
        "There's an issue with the components assets record.",
        safeAssetToUpsert.error,
      );
    }
    const selectAssets = await db.query.componentAssets.findFirst({
      columns: {
        id: true,
      },
      where: and(
        eq(componentAssets.component_id, safeAssetToUpsert.data.component_id!),
        eq(componentAssets.version_id, safeAssetToUpsert.data.version_id!),
        eq(componentAssets.type, safeAssetToUpsert.data.type!),
      ),
    });

    let upsertedAsset;
    if (!selectAssets?.id) {
      const insertAssetsResult = await db
        .insert(componentAssets)
        .values(safeAssetToUpsert.data)
        .returning();

      upsertedAsset = componentAssetsSchema.safeParse(insertAssetsResult[0]);

      if (!upsertedAsset.success) {
        return actionZodError(
          "There's an issue with the inserted components assets record.",
          upsertedAsset.error,
        );
      }
    } else {
      const updateAssetResult = await db
        .update(componentAssets)
        .set({
          url: safeAssetToUpsert.data.url,
        })
        .where(
          and(
            eq(
              componentAssets.component_id,
              safeAssetToUpsert.data.component_id!,
            ),
            eq(componentAssets.version_id, safeAssetToUpsert.data.version_id!),
            eq(componentAssets.type, safeAssetToUpsert.data.type!),
          ),
        )
        .returning();

      const updatedAsset = componentAssetsSchema.safeParse(
        updateAssetResult[0],
      );
      if (!updatedAsset.success) {
        return actionZodError(
          'There was an issue updating the components version.',
          updatedAsset.error,
        );
      }
      upsertedAsset = updatedAsset.data;
    }

    return actionSuccess(upsertedAsset);
  } catch (error) {
    console.error(error);
    return actionError('Failed to update assets into database.');
  }
}

export async function getComponents(): ActionResponse<
  z.infer<typeof componentsWithVersions>[]
> {
  try {
    const select = await db.query.components.findMany({
      with: {
        versions: true,
      },
    });

    const safe = componentsWithVersions.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        "There's an issue with the components records.",
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch components from database.');
  }
}
