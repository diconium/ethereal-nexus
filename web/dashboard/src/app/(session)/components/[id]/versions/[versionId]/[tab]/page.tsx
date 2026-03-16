import React from 'react';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import {
  getComponentAssets,
  getComponentById,
  getComponentDependentsProjects,
  getComponentVersions,
} from '@/data/components/actions';
import ComponentVersionHeader from '@/components/components/component/version/header';
import ComponentVersionTabs from '@/components/components/component/version/tabs';
import { auth } from '@/auth';

export default async function EditComponentVersion(props: any) {
  const { id, versionId, tab } = await props.params;

  const session = await auth();

  const component = await getComponentById(id);
  const versions = await getComponentVersions(id);
  const dependents = await getComponentDependentsProjects(
    id,
    session?.user?.id,
  );
  const assets = await getComponentAssets(id, versionId);

  if (
    !versions.success ||
    !component.success ||
    !dependents.success ||
    !assets.success
  ) {
    notFound();
  }

  const safeDependents = dependents.data.map((p) => (p.has_access ? p : null));
  const selectedVersion = versions.data.filter(
    (version: any) => version.id === versionId,
  )[0];

  return (
    <div className="space-y-6">
      <ComponentVersionHeader
        versions={versions}
        component={component}
        selectedVersion={selectedVersion}
        activeTab={tab}
      />
      <Separator />
      <ComponentVersionTabs
        activeTab={tab}
        versions={versions}
        selectedVersion={selectedVersion}
        component={component}
        dependents={safeDependents}
        assets={assets.data}
      />
    </div>
  );
}
