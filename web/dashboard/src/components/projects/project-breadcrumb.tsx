'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEnvironmentId = searchParams.get('env') ?? undefined;
  const defaultEnvironmentId =
    environments.length > 0 ? environments[0].id : undefined;
  const activeEnvironmentId = currentEnvironmentId ?? defaultEnvironmentId;

  // If the page has no ?env param but there is a default environment,
  // update the URL to include it so the URL always reflects the active env.
  useEffect(() => {
    if (!currentEnvironmentId && defaultEnvironmentId) {
      const basePath = `/projects/${currentProject.id}`;
      const isOnProjectPath =
        pathname === basePath || pathname?.startsWith(`${basePath}/`);
      if (!isOnProjectPath) {
        return;
      }

      if (typeof window !== 'undefined') {
        const hasEnv = new URLSearchParams(window.location.search).has('env');
        if (hasEnv) {
          return;
        }
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('env', defaultEnvironmentId);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          router.replace(`${pathname}?${params.toString()}`);
        } catch (e) {
          // ignore navigation errors
          // console.debug('Failed to replace URL with default env', e);
        }
      })();
    }
    // run only when relevant values change
  }, [
    currentEnvironmentId,
    defaultEnvironmentId,
    pathname,
    searchParams.toString(),
    currentProject.id,
    router,
  ]);

  function onProjectChange(projectId: string) {
    router.push(`/projects/${projectId}`);
  }

  function onEnvironmentChange(envId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('env', envId);
    const targetPath = pathname || `/projects/${currentProject.id}`;
    router.push(`${targetPath}?${params.toString()}`);
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
              {/* Always show the environment select when environments exist.
               If no ?env param is present, show the default (first) environment. */}
              {
                <Select
                  value={activeEnvironmentId}
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
              }
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
