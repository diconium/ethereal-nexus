import React from "react";
import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ToogleIconViewProjects } from '@/components/ui/toogle-icon-view-projects';
import { UpdateProjectsView } from '@/components/ui/update-projects-view';
import { ProjectsViewProvider } from '@/components/components/projects/ProjectsViewProvider';
import { Plus } from 'lucide-react';

export default async function Projects() {
  const session = await auth()
  const projects = await getProjects();

  return (
    <ProjectsViewProvider>
      <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="w-full flex items-end">
          <div className="mr-auto">
            <div className="flex items-baseline">
              <h2 className="text-2xl font-bold tracking-tight">Active Projects</h2>
              <h4 className="pl-2">({projects.success ? projects.data.length : ''})</h4>
            </div>
            <p className="text-muted-foreground">Manage your projects here</p>
          </div>
          {
            projects.success && (
              <Link
                href="/projects/new"
                passHref
                className={cn(
                  buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'mr-2 transition-colors bg-orange-500 rounded-full text-white h-9 px-5 flex justify-center items-center',
                  }),
                  session?.user?.role === 'viewer' && 'pointer-events-none opacity-50',
                )}
              >
                <Plus />
                <span className="text-sm font-bold">New project</span>
              </Link>
            )
          }
          <ToogleIconViewProjects></ToogleIconViewProjects>
        </div>
        {
          projects.success ?
            <UpdateProjectsView projects={projects.data} /> :
            <p>{projects.error.message}</p>
        }
      </div>
    </ProjectsViewProvider>
  );
}
