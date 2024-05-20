'use server'

import {ActionResponse, Result} from '@/data/action';
import {z} from 'zod';
import {actionError, actionSuccess, actionZodError} from '@/data/utils';
import {db} from '@/db';

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
import {and, eq, sql} from 'drizzle-orm';
import {
    componentAssets,
    components,
    componentVersions,
} from '@/data/components/schema';
import {revalidatePath} from 'next/cache';
import {projectComponentConfig, projects} from "@/data/projects/schema";
import {projectWithOwners, ProjectWithOwners} from "@/data/projects/dto";
import {members} from "@/data/member/schema";
import {users} from "@/data/users/schema";

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
        } else {
            const updateComponentResult = await db
                .update(components)
                .set({
                    title: safeComponent.data.title,
                    description: safeComponent.data.description,
                })
                .where(eq(components.id, select!.id))
                .returning();

            const updatedComponent = componentsSchema.safeParse(
                updateComponentResult[0],
            );
            if (!updatedComponent.success) {
                return actionZodError(
                    'There was an issue updating the component.',
                    updatedComponent.error,
                );
            }
            upsertedComponent = updatedComponent.data;
        }

        if (!upsertedComponent) {
            return actionError('Failed to fetch or update component');
        }

        let upsertedVersion: ComponentVersion;
        const versionToUpsert = {
            component_id: upsertedComponent.id,
            version: component.version,
            dialog: component.dialog,
            readme: component.readme,
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

export async function upsertAssets(
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
            console.error(
                'updateAssets: failed to fetch component version',
                selectComponentVersion,
            );
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
            console.error(
                'updateAssets: asset input is not valid',
                JSON.stringify(safeAssetToUpsert, undefined, 2),
            );
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
                console.error(
                    'updateAssets: failed to upsert asset',
                    JSON.stringify(upsertedAsset, undefined, 2),
                );

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
                console.error(
                    'updateAssets: failed to upsert asset',
                    JSON.stringify(updatedAsset, undefined, 2),
                );

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

export async function getComponentById(
    id: string,
): ActionResponse<z.infer<typeof componentsSchema>> {
    if (!id) {
        return actionError('No identifier provided.');
    }

    try {
        const select = await db.query.components.findFirst({
            where: eq(components.id, id),
        });

        const safe = componentsSchema.safeParse(select);
        if (!safe.success) {
            return actionZodError(
                "There's an issue with the component records.",
                safe.error,
            );
        }

        return actionSuccess(safe.data);
    } catch (error) {
        console.error(error);
        return actionError('Failed to fetch component from database.');
    }
}

export async function getComponentVersions(
    id: string,
): ActionResponse<z.infer<typeof componentVersionsSchema>[]> {
    if (!id) {
        return actionError('No identifier provided.');
    }

    try {
        const select = await db.query.componentVersions.findMany({
            where: eq(componentVersions.component_id, id),
        });
        const safe = componentVersionsSchema.array().safeParse(select);
        if (!safe.success) {
            return actionZodError(
                "There's an issue with the component records.",
                safe.error,
            );
        }

        return actionSuccess(safe.data);
    } catch (error) {
        // console.error(error);
        return actionError('Failed to fetch component from database.');
    }
}

export async function getComponentDependentsProjectsWithOwners(
    component_id: string,
): ActionResponse<ProjectWithOwners[]> {
    if (!component_id) {
        return actionError('No component id provided.');
    }
    try {
        const select = await db.select(
            {
                id: projects.id,
                name: projects.name,
                description: projects.description,
                owners:  sql`ARRAY_AGG(${users.name})`
            })
            .from(projectComponentConfig)
            .leftJoin(projects, eq(projects.id, projectComponentConfig.project_id))
            .leftJoin(members,
                and(
                    eq(members.resource, projectComponentConfig.project_id),
                    eq(members.role, 'owner')))
            .leftJoin(users,eq(users.id,members.user_id))
            .where(eq(projectComponentConfig.component_id, component_id))
            .groupBy(
               projects.id,
            )

        const safe = projectWithOwners.array().safeParse(select);
        if (!safe.success) {
            return actionZodError(
                "There's an issue with the component records.",
                safe.error,
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
    version_id: string,
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
                "There's an issue with the component records.",
                safe.error,
            );
        }

        return actionSuccess(safe.data);
    } catch (error) {
        // console.error(error);
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
                "There's an issue with the components records.",
                safe.error,
            );
        }

        revalidatePath('/components')
        return actionSuccess(safe.data);
    } catch (error) {
        console.error(error);
        return actionError('Failed to delete component from database.');
    }
}
