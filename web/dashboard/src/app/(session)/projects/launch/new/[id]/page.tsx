import React from 'react';
import { ComparisonResult, LaunchesList } from '@/components/launches/table/launches-list';
import { getEnvironmentsById, getEnvironmentsByProject } from '@/data/projects/actions';
import { auth } from '@/auth';
import { EnvironmentWithComponents } from '@/data/projects/dto';
import { notFound } from 'next/navigation';
import { EnvironmentPicker } from './picker';

function compareEnvironments(from: EnvironmentWithComponents, to: EnvironmentWithComponents): ComparisonResult[] {
  const result: ComparisonResult[] = [];

  from.components.forEach((compFrom) => {
    const compTo = to.components.find((c) => c.id === compFrom.id);

    if (compTo) {
      result.push({
        id: compFrom.id,
        name: compFrom.name,
        title: compFrom.title,
        new: false,
        is_active: {
          from: compFrom.is_active,
          to: compTo.is_active,
        },
        version: {
          from: compFrom.version || 'latest',
          to: compTo.version || 'latest',
        },
      });
    } else {
      result.push({
        id: compFrom.id,
        name: compFrom.name,
        title: compFrom.title,
        new: true,
        is_active: {
          from: compFrom.is_active,
          to: null,
        },
        version: {
          from: compFrom.version || 'latest',
          to: null,
        },
      })
    }
  });

  return result;
}

export default async function NewLaunch({ params: { id } }: any) {
  const session = await auth()
  const [fromId, toId] = id.split('...')

  const from = await getEnvironmentsById(fromId, session?.user?.id)
  const to = await getEnvironmentsById(toId, session?.user?.id)

  if (!from.success || !to.success || from.data.project_id !== to.data.project_id) {
    notFound();
  }

  const environments = await getEnvironmentsByProject(from.data.project_id)
  const comparison = compareEnvironments(from.data, to.data);

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="w-full flex items-end">
        <div className="mr-auto">
          <div className="flex items-baseline">
            <h2 className="text-2xl font-bold tracking-tight">Create Launch</h2>
          </div>
          <p className="text-muted-foreground">Compare the changes to launch</p>
        </div>
      </div>
      <EnvironmentPicker
        from={from.data}
        to={to.data}
        environments={environments.success ? environments.data : []}
      />
      <LaunchesList
        from={from.data}
        to={to.data}
        comparison={comparison}
      />
    </div>
  );
}
