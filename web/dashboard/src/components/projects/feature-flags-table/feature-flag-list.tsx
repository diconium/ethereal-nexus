import React from 'react';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  getComponentsNotInEnvironment,
  getEnvironmentComponents,
  getEnvironmentsByProject,
  getFeatureFlagsByEnvAndProject,
} from '@/data/projects/actions';
import { FeatureFlagDialog } from '@/components/projects/feature-flags-table/feature-flag-dialog';
import { columns } from '@/components/projects/feature-flags-table/columns';
import { auth } from '@/auth';

export async function FeatureFlagList({ id, environmentId, componentId }: { id: string, environmentId: string, componentId?: string }) {
  const session = await auth();
  const environments = await getEnvironmentsByProject(id);

  if(!environments.success) {
    throw new Error('Users are not available.')
  }

  const selectedEnvironment = environmentId || environments.data[0].id;

  const components = await getEnvironmentComponents(selectedEnvironment);

  if(!components.success) {
    throw new Error(components.error.message);
  }

  const featureFlags = await getFeatureFlagsByEnvAndProject(selectedEnvironment, id, componentId);


  return (
    <DataTable
      columns={columns}
      data={featureFlags}
      meta={{
        projectId: id,
        environmentId: selectedEnvironment,
        permissions: session?.permissions[id],
      }}
      filterColumn={'flag_name'}
      entity={'feature flags'}
      createSlot={<FeatureFlagDialog
        componentId={componentId}
        components={[{ id: '', title: null, description: '', slug: null,  name: 'All', is_ai_generated: false }, ...components?.data||[] ]}
        environmentId={selectedEnvironment}
        resource={id}
        environments={environments?.data}/>}
    />
  );
}
