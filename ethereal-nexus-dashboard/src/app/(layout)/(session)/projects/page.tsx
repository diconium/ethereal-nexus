import React from "react";
import { getProjectById, getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import {logger} from "@/logger";
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ToogleIconViewProjects } from '@/components/ui/toogle-icon-view-projects';
import { UpdateTableView } from '@/components/ui/update-table-view';
import { ProjectsViewProvider } from '@/components/components/projects/ProjectsViewProvider';
import { getUsers } from '@/data/users/actions';
import { getMembersByResourceId } from '@/data/member/actions';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects(session?.user?.id);

  if (projects.success) {
    projects.data = await Promise.all(
      projects.data.map(async (project) => {
        const membersData = await getMembersByResourceId(project.id, session?.user?.id);
        return { ...project, membersLength: membersData.data.length };
      })
    );
  }

  logger.info("Projects Page called "); // calling our logger

  return (
    <ProjectsViewProvider>
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
            <ToogleIconViewProjects></ToogleIconViewProjects>
          </div>
        </div>
        <UpdateTableView projects={projects}/>
      </div>
    </ProjectsViewProvider>
  );
}
