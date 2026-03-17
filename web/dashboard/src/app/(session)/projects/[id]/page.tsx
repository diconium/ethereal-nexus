import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjectById } from '@/data/projects/actions';
import { notFound } from 'next/navigation';
import { ProjectComponentsList } from '@/components/projects/component-selection-table/components-list';
import Link from 'next/link';
import { EnvironmentsList } from '@/components/projects/environments-table/environment-list';
import { auth } from '@/auth';
import { FeatureFlagList } from '@/components/projects/feature-flags-table/feature-flag-list';
import { SessionProvider } from 'next-auth/react';

export default async function EditProject(props: any) {
  const { tab = 'components', env, component } = await props.searchParams;
  const { id } = await props.params;
  const session = await auth();
  const hasWritePermissions =
    session?.user?.role === 'admin' ||
    ['write', 'manage'].includes(session?.permissions[id] || '');
  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-4xl font-semibold">{project.data.name}</h1>
          <p className="text-muted-foreground">{project.data.description}</p>
        </div>
      </div>
      <Tabs value={tab} defaultValue="components" className="space-y-10">
        <TabsList>
          <TabsTrigger value="components" asChild>
            <Link
              href={`/projects/${id}?tab=components${env ? `&env=${env}` : ''}`}
            >
              Components
            </Link>
          </TabsTrigger>
          <TabsTrigger value="environments" asChild>
            <Link
              href={`/projects/${id}?tab=environments${env ? `&env=${env}` : ''}`}
            >
              Environments
            </Link>
          </TabsTrigger>
          {hasWritePermissions ? (
            <TabsTrigger value="featureFlags" asChild>
              <Link
                href={`/projects/${id}?tab=featureFlags${env ? `&env=${env}` : ''}${component ? `&component=${component}` : ''}`}
              >
                Feature Flags
              </Link>
            </TabsTrigger>
          ) : null}
        </TabsList>
        <SessionProvider session={session}>
          <TabsContent value={tab} className="space-y-4">
            {(() => {
              switch (tab) {
                case 'components':
                  return (
                    <ProjectComponentsList
                      key={env}
                      id={id}
                      environment={env}
                    />
                  );
                case 'environments':
                  return <EnvironmentsList id={id} />;
                case 'featureFlags':
                  return (
                    <FeatureFlagList
                      key={env}
                      id={id}
                      environmentId={env}
                      componentId={component}
                    />
                  );
                default:
                  return null;
              }
            })()}
          </TabsContent>
        </SessionProvider>
      </Tabs>
    </div>
  );
}
