import React from "react";
import { DataTable } from '@/components/ui/data-table/data-table';
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { columns } from '@/components/projects/table/columns';
import {logger} from "@/logger";
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ToogleViewProjects } from '@/components/ui/toogle-view-projects';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects(session?.user?.id);
  logger.info("Projects Page called "); // calling our logger

  return (
    <div className="container h-full flex-1 flex-col space-y-4 md:flex">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline">
          <h2 className="text-4xl font-bold tracking-tight">Active Projects</h2>
          <h4 className="pl-2">({projects.success ? projects.data.length : ''})</h4>
        </div>
        <div className="flex items-center">
          {
            projects.success && (
              <Link
                href="/projects/new"
                passHref
                className={cn(
                  buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'mr-2 transition-colors bg-orange-600 rounded-full text-white py-4 px-8 flex justify-center items-center',
                  }),
                  session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
                )}
              >
                <span className="text-sm font-bold">New project</span>

              </Link>
            )
          }
          <ToogleViewProjects></ToogleViewProjects>
        </div>
      </div>

      {
        projects.success ?
          <DataTable
            colWidth
            entity={'projects'}
            columns={columns}
            data={projects.data}
            isShowViewOpt={false}
          /> :
          projects.error.message
      }
    </div>

  );
}
