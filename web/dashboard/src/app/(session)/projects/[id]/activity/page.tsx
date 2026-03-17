import React from 'react';
import { auth } from '@/auth';
import { getProjectById } from '@/data/projects/actions';
import { notFound } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import ProjectEventsClient from '@/components/projects/project-events/ProjectEventsClient';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const project = await getProjectById(id);

  if (!project.success) {
    notFound();
  }

  const getParam = (key: string) => {
    const value = query?.[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pageIndex = parseInt(getParam('pageIndex') ?? '0', 10);
  const pageSize = parseInt(getParam('pageSize') ?? '10', 10);
  const userId = getParam('userId') ?? undefined;
  const componentId = getParam('componentId') ?? undefined;
  const type = getParam('type') ?? undefined;
  const startDate = getParam('startDate') ?? undefined;
  const endDate = getParam('endDate') ?? undefined;
  const sortField = getParam('sortField') ?? undefined;
  const sortDir = getParam('sortDir') ?? undefined;
  const globalFilter = getParam('globalFilter') ?? '';

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-4xl font-semibold">{project.data.name}</h1>
          <p className="text-muted-foreground">{project.data.description}</p>
        </div>
      </div>
      <SessionProvider session={session}>
        <ProjectEventsClient
          id={id}
          initialPageIndex={pageIndex}
          initialPageSize={pageSize}
          initialUserId={userId}
          initialComponentId={componentId}
          initialType={type}
          initialStartDate={startDate}
          initialEndDate={endDate}
          initialSortField={sortField}
          initialSortDir={sortDir}
          initialGlobalFilter={globalFilter}
          hideProjectColumn
        />
      </SessionProvider>
    </div>
  );
}
