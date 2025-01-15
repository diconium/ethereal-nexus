'use server';

import { ActionResponse, Result } from '@/data/action';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import {
  Component,
  componentAssetsCreateSchema,
  componentAssetsSchema,
  componentsSchema,
  componentsUpsertSchema,
  componentsWithVersions,
  ComponentToUpsert,
  componentVersionsCreateSchema,
  componentVersionsSchema,
  ComponentWithVersion, NewComponentVersion
} from './dto';
import {
  componentAssets,
  components,
  componentVersions
} from '@/data/components/schema';
import { revalidatePath } from 'next/cache';
import { environments, projectComponentConfig, projects } from '@/data/projects/schema';
import { projectWithOwners, ProjectWithOwners } from '@/data/projects/dto';
import { members } from '@/data/member/schema';
import { users } from '@/data/users/schema';
import { logEvent } from '@/lib/events/event-middleware';
import { userIsMember } from '@/data/member/actions';
import { EtherealStorage } from '@/storage/ethereal-storage';
import { auth } from "@/auth";

const storage = new EtherealStorage();

async function upsertComponentVersion(version: NewComponentVersion) {
  const safeVersion = componentVersionsCreateSchema.safeParse(version);
  if (!safeVersion.success) {
    return actionZodError(
      'There\'s an issue with the component version record.',
      safeVersion.error
    );
  }
  const result = await db
    .insert(componentVersions)
    .values(safeVersion.data)
    .onConflictDoUpdate({
      target: [
        componentVersions.component_id,
        componentVersions.version
      ],
      set: {
        dialog: safeVersion.data.dialog,
        readme: safeVersion.data.readme,
        changelog: safeVersion.data.changelog
      }
    })
    .returning();

  const insertedVersion = componentVersionsSchema.safeParse(
    result[0]
  );
  if (!insertedVersion.success) {
    return actionZodError(
      'There\'s an issue with the inserted component version record.',
      insertedVersion.error
    );
  }

  return actionSuccess(insertedVersion.data);
}

export async function upsertNewComponent(formData: FormData, componentName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError('No user provided.');
  }

  const filesMap: { [key: string]: string } = {};

  for (const [filePath, content] of formData.entries()) {
    if (typeof content === 'string') {
      filesMap[filePath] = content;
    }
  }

  const manifestFile = filesMap[`/dist/.ethereal/${componentName}/manifest.json`];

  if (!manifestFile) {
    return actionError('No manifest present in the bundle.');
  }

  const manifest = JSON.parse(manifestFile);
  manifest.is_ai_generated = true;

  const result = await upsertComponentWithVersion(manifest, session?.user?.id);
  if (!result.success) {
    return actionError(result.error.message);
  }

  const { id, slug, version } = result.data;

  for (const [fileName, content] of Object.entries(filesMap)) {
    if (fileName.endsWith('.js') || fileName.endsWith('.css')) {
      const urlObject = await storage.uploadToStorage(
          content,
          `${slug}/${version.version}`,
          fileName
      );

      if (!urlObject) {
        return actionError('Failed to upload assets, no url returned.');
      }

      let type: 'css' | 'js' | 'chunk' | 'server' = 'chunk' as const;
      if (fileName.endsWith('.css')) {
        type = 'css';
      } else if (fileName.endsWith('index.js')) {
        type = 'js';
      } else if (fileName.endsWith('server.js')) {
        type = 'server';
      }

      const response = await upsertAssets(
          id,
          version.id,
          urlObject.toString(),
          type
      );

      if (!response.success && response.error.message !== 'Asset already exists.') {
        return actionError('Failed to upsert assets');
      }
    }
  }
  return actionSuccess({
    ...result.data,
  });
};

export async function upsertComponentWithVersion(
  component: ComponentToUpsert,
  userId?: string
): Promise<Result<ComponentWithVersion>> {
  if (!userId) {
    return actionError('No user provided.');
  }

  const safeComponent = componentsUpsertSchema.safeParse(component);
  if (!safeComponent.success) {
    return actionZodError(
      'There\'s an issue with the component record.',
      safeComponent.error
    );
  }
  try {
    const insertComponent = await db
      .insert(components)
      .values(safeComponent.data)
      .onConflictDoUpdate({
        target: components.slug,
        set: {
          name: safeComponent.data.name,
          title: safeComponent.data.title,
          description: safeComponent.data.description
        }
      })
      .returning();

    const result = componentsSchema.safeParse(insertComponent[0]);
    if (!result.success) {
      console.error(result.error);
      return actionError('Failed to upsert component');
    }
    const upsertedVersion = await upsertComponentVersion({
      component_id: result.data.id,
      ...component
    });
    if (!upsertedVersion.success) {
      return actionError(
        upsertedVersion.error.message
      );
    }

    const eventData =
      {
        'component_id': result?.data.id,
        'version_id': upsertedVersion.data.id
      };

    await logEvent({
      data: eventData,
      resource_id: result?.data.id,
      type: 'component_update',
      user_id: userId
    });

    return actionSuccess({
      ...result.data,
      version: upsertedVersion.data
    });
  } catch (error) {
    console.error(error);
    return actionError('Failed to insert component into database.');
  }
}

export async function upsertAssets(
  componentId: string,
  versionId: string,
  url: string,
  contentType: 'css' | 'js' | 'chunk' | 'server' | null
) {
  try {
    const assetToUpsert: z.infer<typeof componentAssetsCreateSchema> = {
      component_id: componentId,
      version_id: versionId!,
      url,
      type: contentType
    };

    const safeAssetToUpsert =
      componentAssetsCreateSchema.safeParse(assetToUpsert);
    if (!safeAssetToUpsert.success) {
      console.error(
        'updateAssets: asset input is not valid',
        JSON.stringify(safeAssetToUpsert, undefined, 2)
      );
      return actionZodError(
        'There\'s an issue with the components assets record.',
        safeAssetToUpsert.error
      );
    }

    const upsertedAsset = await db
      .insert(componentAssets)
      .values(safeAssetToUpsert.data)
      .onConflictDoNothing({
        target: [
          componentAssets.component_id,
          componentAssets.version_id,
          componentAssets.url
        ]
      })
      .returning();

    if (upsertedAsset.length === 0) {
      return actionError('Asset already exists.');
    }

    const result = componentAssetsSchema.safeParse(upsertedAsset[0]);
    if (!result.success) {
      console.error(
        'updateAssets: failed to upsert asset',
        JSON.stringify(result.error, undefined, 2)
      );

      return actionZodError(
        'There\'s an issue with the inserted components assets record.',
        result.error
      );
    }

    return actionSuccess(result.data);
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
        versions: true
      }
    });

    const safe = componentsWithVersions.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the components records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch components from database.');
  }
}

export async function getComponentById(
  id: string
): ActionResponse<z.infer<typeof componentsSchema>> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  try {
    const select = await db.query.components.findFirst({
      where: eq(components.id, id)
    });

    const safe = componentsSchema.safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch component from database.');
  }
}

export async function getComponentByName(
  name: string
): ActionResponse<z.infer<typeof componentsSchema>> {
  if (!name) {
    return actionError('No name provided.');
  }

  try {
    const select = await db.query.components.findFirst({
      where: eq(components.name, name)
    });

    const safe = componentsSchema.safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch component from database.');
  }
}

export async function getComponentVersions(
  id: string
): ActionResponse<z.infer<typeof componentVersionsSchema>[]> {
  if (!id) {
    return actionError('No identifier provided.');
  }

  try {
    const select = await db.query.componentVersions.findMany({
      where: eq(componentVersions.component_id, id)
    });
    const safe = componentVersionsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch component from database.');
  }
}

export async function getComponentDependentsProjects(
  id: string,
  userId?: string
): ActionResponse<ProjectWithOwners[]> {
  if (!id) {
    return actionError('No component id provided.');
  }

  if (!userId) {
    return actionError('No user id provided.');
  }

  try {
    const select = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      owners: sql`ARRAY_AGG(DISTINCT jsonb_build_object('id', ${users.id}, 'name', ${users.name}))`,
      has_access: await userIsMember(userId, projects.id),
    })
      .from(projectComponentConfig)
      .leftJoin(environments, eq(environments.id, projectComponentConfig.environment_id))
      .leftJoin(projects, eq(projects.id, environments.project_id))
      .leftJoin(members,
        and(
          eq(members.resource, environments.project_id),
          eq(members.role, 'owner')
        )
      )
      .leftJoin(users, eq(users.id, members.user_id))
      .where(
        eq(projectComponentConfig.component_id, id),
      )
      .groupBy(
        projects.id,
        users.name
      )

    const safe = projectWithOwners.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch components from database.');
  }
}

export async function getComponentAssets(
  component_id: string,
  version_id: string
): ActionResponse<z.infer<typeof componentAssetsSchema>[]> {
  if (!component_id) {
    return actionError('No component id provided.');
  }
  try {
    const select = await db.query.componentAssets.findMany({
      where: and(
        eq(componentAssets.component_id, component_id),
        eq(componentAssets.version_id, version_id)
      )
    });
    const safe = componentAssetsSchema.array().safeParse(select);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the component records.',
        safe.error
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to fetch component from database.');
  }
}

export async function deleteComponent(id: string): ActionResponse<Component> {
  try {
    const del = await db.delete(components)
      .where(eq(components.id, id))
      .returning();

    const safe = componentsSchema.safeParse(del);
    if (!safe.success) {
      return actionZodError(
        'There\'s an issue with the components records.',
        safe.error
      );
    }

    revalidatePath('/components');
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete component from database.');
  }
}
