import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjectById } from '@/data/projects/actions';
import { notFound } from 'next/navigation';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { ProjectComponentsList } from '@/components/projects/component-selection-table/components-list';
import Link from 'next/link';
import ProjectsForm from '@/components/projects/project-form';
import { ProjectEvents } from '@/components/projects/project-events/project-events';
import { EnvironmentsList } from '@/components/projects/environments-table/environment-list';
import { auth } from '@/auth';

export default async function EditProject(props: any) {
  const {
    tab = 'components',
    env,
    userFilter,
    componentFilter,
    initialDateFilter,
    finalDateFilter
  } = await props.searchParams;

  const {
    id,
  } = await props.params;

  const session = await auth();
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[id] || '');

  const project = await getProjectById(id);
  if (!project.success) {
    notFound();
  }

  return (<div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{project.data.name}</h2>
          <p className="text-muted-foreground">{project.data.description}</p>
        </div>
      </div>
      <Tabs value={tab} defaultValue="components" className="space-y-10 mt-6">
        <TabsList>
          <TabsTrigger value="components" asChild>
            <Link href={`/projects/${id}?tab=components`}>
              Components
            </Link>
          </TabsTrigger>
          <TabsTrigger value="users" asChild>
            <Link href={`/projects/${id}?tab=users`}>
              Users
            </Link>
          </TabsTrigger>
          <TabsTrigger value="environments" asChild>
            <Link href={`/projects/${id}?tab=environments`}>
              Environments
            </Link>
          </TabsTrigger>
          {hasWritePermissions ? <>
            <TabsTrigger value="settings" asChild>
              <Link href={`/projects/${id}?tab=settings`}>
                Settings
              </Link>
            </TabsTrigger>
            <TabsTrigger value="activity" asChild>
              <Link href={`/projects/${id}?tab=activity`}>
                Activity
              </Link>
            </TabsTrigger>
          </> : null}
        </TabsList>
        <TabsContent value={tab} className="space-y-4">
          {(() => {
            switch (tab) {
              case 'components':
                return   <ProjectComponentsList
                  key={env}
                  id={id}
                  environment={env}
                />
              case 'users':
                return <ProjectMemberList
                  id={id}
                />
              case 'environments':
                return  <EnvironmentsList
                  id={id}
                />
              case 'settings':
                return <ProjectsForm
                  project={project.data}
                />
              case 'activity':
                const filter = {
                  userFilter,
                  componentFilter,
                  initialDateFilter,
                  finalDateFilter,
                  
                }
                return <ProjectEvents id={id} filter={filter} environment={env}/>
              default:
                return null
            }
          })()}
        </TabsContent>
      </Tabs>
    </div>);
}
