import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjectById } from '@/data/projects/actions';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { ProjectComponentsList } from '@/components/projects/component-selection-table/components-list';
import Link from 'next/link';
import ProjectsForm from '@/components/projects/project-form';
import { getResourceEvents } from '@/data/events/actions';
import { ProjectEvents } from '@/components/projects/project-events/project-events';

export default async function EditProject({ params: { id }, searchParams: { tab } }: any) {
  const session = await auth();
  const project = await getProjectById(id, session?.user?.id);
  const events = await getResourceEvents(id);

  if (!project.success) {
    notFound();
  }

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
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
        </TabsList>
        <TabsContent value="components" className="space-y-4">
          <ProjectComponentsList
            id={id}
          />
        </TabsContent>
        <TabsContent value="users" className="space-y-4">
          <ProjectMemberList
            id={id}
          />
        </TabsContent>
        <TabsContent value="settings">
          <ProjectsForm
            project={project.data}
          />
        </TabsContent>
        <TabsContent value="activity">
         <ProjectEvents events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
