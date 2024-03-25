import React from "react";
import { DataTable } from '@/components/ui/data-table/data-table';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { columns } from '@/components/projects/table/columns';
import {logger} from "@/logger";
import { buttonVariants } from '@/components/ui/button';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects(session?.user?.id);
  logger.info("Projects Page called "); // calling our logger

  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-baseline">
          <h2 className="text-2xl font-bold tracking-tight w-2/2">Active Projects</h2>
          <h4 className="w-2/2 pl-2">({projects.success ? projects.data.length : ''})</h4>
        </div>
      </div>
      {
        projects.success ?
          <DataTable
            colWidth
            entity={'projects'}
            columns={columns}
            data={projects.data}
            createSlot={
              <Link
                href={'/projects/new'}
                passHref
                className={
                cn(
                  buttonVariants(
                    {
                      variant: "outline",
                      size: 'sm',
                      className: "ml-auto hidden h-8 lg:flex mr-4" }
                  ),
                  session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
                )
                }>
                <PlusCircledIcon className="mr-2 h-4 w-4" />
                  Create project
              </Link>
            }
          /> :
          projects.error.message
      }
    </div>
  );
}
