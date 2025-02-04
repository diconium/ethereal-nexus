import React from 'react';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from '@/components/projects/table/columns';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects();

  if (!projects.success) {
    notFound()
  }

  return (
      <>
        <h1 className="text-4xl font-semibold">Active Projects</h1>
        <p className="mb-10">Manage your projects here</p>
        <DataTable
          colWidth
          entity={'projects'}
          columns={columns}
          data={projects.data}
          filterColumn={'name'}
          createSlot={
            <Button className="ml-auto" asChild disabled={session?.user?.role === 'viewer'}>
              <Link href="/projects/new">
                <Plus />
                <span className="text-sm font-bold">Create project</span>
              </Link>
            </Button>
          }
        />
      </>
  );
}
