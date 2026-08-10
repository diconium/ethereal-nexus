import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getProjectById } from '@/data/projects/actions';
import { getBlueprints, getCmsConnections } from '@/data/cms/actions';
import { getNexusLibrary } from '@/data/meta/design/actions';
import {
  getMappings,
  createMapping,
  getMappingWorkbench,
} from '@/data/meta/mapping/actions';
import { getEnvironmentComponents, getEnvironmentComponentsWithDialog } from '@/data/projects/actions';
import { ContentPlaceholder } from '@/components/projects/content/content-placeholder';
import { MappingWorkbench } from '@/components/projects/content/mapping-workbench';
import { ArrowLeftRight } from 'lucide-react';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContentMappingsPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
  const query = await searchParams;
  const mappingParam = Array.isArray(query.mapping)
    ? query.mapping[0]
    : query.mapping;
  const blueprintParam = Array.isArray(query.blueprint)
    ? query.blueprint[0]
    : query.blueprint;
  const envParam = Array.isArray(query.env) ? query.env[0] : query.env;

  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  const [blueprints, library, connections, projectComponents] = await Promise.all([
    getBlueprints(id),
    getNexusLibrary(id),
    getCmsConnections(id),
    getEnvironmentComponentsWithDialog(envParam ?? null),
  ]);

  const bpList = blueprints.success ? blueprints.data : [];
  const lib = library.success ? library.data : null;

  // Need at least one blueprint and a non-empty library to map.
  if (bpList.length === 0 || !lib || lib.definitions.length === 0) {
    return (
      <ContentPlaceholder
        title="Mappings"
        description={
          bpList.length === 0
            ? 'Discover a Blueprint first, then map its structure to your Nexus Library.'
            : 'Seed your Nexus Library from a Blueprint, then create mappings.'
        }
        icon={ArrowLeftRight}
      />
    );
  }

  // Resolve the source blueprint: explicit ?blueprint param, else the first.
  const selectedBlueprint =
    bpList.find((b) => b.definitionId === blueprintParam) ?? bpList[0];
  const blueprintDefinitionId = selectedBlueprint.definitionId;

  // Resolve (or lazily create) a mapping for the selected blueprint.
  let mappingId = mappingParam ?? null;

  if (!mappingId) {
    const existing = await getMappings(id, blueprintDefinitionId);
    if (existing.success && existing.data.length > 0) {
      mappingId = existing.data[0].id;
    } else {
      const created = await createMapping({
        projectId: id,
        blueprintDefinitionId,
        name: `${selectedBlueprint.name} → Nexus Library`,
      });
      if (created.success) mappingId = created.data.id;
    }
  }

  if (!mappingId) {
    notFound();
  }

  const workbench = await getMappingWorkbench(mappingId);
  if (!workbench.success) {
    notFound();
  }

  const connectionOptions = connections.success
    ? connections.data.map((c) => ({
        id: c.id,
        name: c.name,
        provider: c.provider,
      }))
    : [];

  const blueprintOptions = bpList.map((b) => ({
    definitionId: b.definitionId,
    name: b.name,
    provider: b.provider,
  }));

  return (
    <MappingWorkbench
      workbench={workbench.data}
      library={lib.definitions}
      connections={connectionOptions}
      blueprints={blueprintOptions}
      projectComponents={projectComponents.success ? projectComponents.data : []}
    />
  );
}
