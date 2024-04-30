import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProjectById } from '@/data/projects/actions';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { ProjectComponentsList } from '@/components/projects/component-selection-table/components-list';
import Link from 'next/link';
import { Overview } from '@/components/projects/overview';

export default async function EditProject({ params: { id }, searchParams: { tab } }: any) {
  const session = await auth();
  const project = await getProjectById(id, session?.user?.id);

  if (!project.success) {
    notFound();
  }

  return (
    <div className="container space-y-6">
      <Tabs value={tab} defaultValue="overview" className="space-y-10 mt-6">
        <TabsList className="w-[21.5rem]">
          <TabsTrigger value="overview" asChild>
            <Link href={`/projects/${id}?tab=overview`}>
              Overview
            </Link>
          </TabsTrigger>
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
        </TabsList>
        <TabsContent value="overview" className="py-6">
          <Overview
            project={project.data}
          />
        </TabsContent>
        <TabsContent value="components" className="space-y-4 p-6">
        <ProjectComponentsList
            id={id}
          />
        </TabsContent>
        <TabsContent value="users" className="space-y-4 p-6">
          <ProjectMemberList
            id={id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
