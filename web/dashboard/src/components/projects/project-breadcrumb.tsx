'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Project = { id: string; name: string };
type Environment = { id: string; name: string };

type ProjectBreadcrumbProps = {
  projects: Project[];
  currentProject: Project;
  environments: Environment[];
};

export function ProjectBreadcrumb({
  projects,
  currentProject,
  environments,
}: ProjectBreadcrumbProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEnvironmentId = searchParams.get('env') ?? undefined;

  function onProjectChange(projectId: string) {
    router.push(`/projects/${projectId}`);
  }

  function onEnvironmentChange(envId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('env', envId);
    router.push(`/projects/${currentProject.id}?${params.toString()}`);
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <Select value={currentProject.id} onValueChange={onProjectChange}>
            <SelectTrigger className="h-7 border-none shadow-none bg-transparent px-2 text-sm font-medium text-foreground focus:ring-0 gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BreadcrumbItem>
        {environments.length > 0 && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {currentEnvironmentId ? (
                <Select
                  value={currentEnvironmentId}
                  onValueChange={onEnvironmentChange}
                >
                  <SelectTrigger className="h-7 border-none shadow-none bg-transparent px-2 text-sm font-medium text-foreground focus:ring-0 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {environments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <BreadcrumbPage className="text-muted-foreground font-normal">
                  All environments
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
