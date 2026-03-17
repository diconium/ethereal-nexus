'use client';

/**
 * ProjectSwitcher — shows the currently selected project and lets the user switch
 * between projects from the sidebar header.
 *
 * Data is driven by ProjectContext (which fetches from /api/projects). No static
 * `projects[]` prop is needed any more.
 */

import * as React from 'react';
import { ChevronsUpDown, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useProject } from '@/lib/project-context';
import type { Project } from '@/lib/types';

export function ProjectSwitcher() {
  const { isMobile } = useSidebar();
  const { projects, selectedProject, loading, setSelectedProject } =
    useProject();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleProjectSelect = React.useCallback(
    (project: Project) => {
      setSelectedProject(project);

      const currentPath = pathname ?? '';
      const isProjectPath = currentPath.startsWith('/projects/');
      if (isProjectPath) {
        const pathSuffix = currentPath.replace(/^\/projects\/[^/]+/, '');
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.delete('env');
        const query = params.toString();
        const target = `/projects/${project.id}${pathSuffix}${
          query ? `?${query}` : ''
        }`;
        router.push(target);
      } else {
        router.push(`/projects/${project.id}?tab=components`);
      }
    },
    [pathname, router, searchParams, setSelectedProject],
  );

  // ── Loading / empty states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <FolderKanban className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-sidebar-foreground/50">
                Loading…
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (projects.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <FolderKanban className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No projects</span>
              <span className="truncate text-xs text-sidebar-foreground/50">
                Create one in Projects
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            size="sm"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Link href="/projects">
              <span className="flex-1 truncate">Go to Projects</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (projects.length > 0 && !selectedProject) {
    const firstFiveProjects = projects.slice(0, 5);

    return (
      <SidebarMenu>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FolderKanban className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">Select a project</span>
            <span className="truncate text-xs text-sidebar-foreground/50">
              Choose from your projects
            </span>
          </div>
        </SidebarMenuButton>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="sm">
                <span className="flex-1 truncate">First 5 projects</span>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Projects ({projects.length})
              </DropdownMenuLabel>
              {firstFiveProjects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <FolderKanban className="size-3.5 shrink-0" />
                  </div>
                  <span className="flex-1 truncate">{project.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2 text-muted-foreground"
                asChild
              >
                <Link href="/projects">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <span className="text-xs font-bold">+</span>
                  </div>
                  View all projects
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!selectedProject) {
    return null;
  }

  // ── Switcher ───────────────────────────────────────────────────────────────

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <FolderKanban className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {selectedProject.name}
                </span>
                {selectedProject.description && (
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {selectedProject.description}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Projects
            </DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <FolderKanban className="size-3.5 shrink-0" />
                </div>
                <span className="flex-1 truncate">{project.name}</span>
                {project.id === selectedProject.id && (
                  <span className="text-xs text-muted-foreground">active</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 text-muted-foreground"
              asChild
            >
              <Link href="/projects">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <span className="text-xs font-bold">+</span>
                </div>
                Manage projects
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
