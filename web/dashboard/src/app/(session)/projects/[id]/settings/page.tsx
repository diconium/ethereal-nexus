import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getProjectById,
  getProjectSettingsSummary,
} from '@/data/projects/actions';
import ProjectsForm from '@/components/projects/project-form';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import { Layers, LayoutGrid, Flag, Users as UsersIcon } from 'lucide-react';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SETTINGS_SECTIONS = new Set(['general', 'members']);

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const requestedSection = Array.isArray(query?.section)
    ? query?.section[0]
    : query?.section;
  const section = SETTINGS_SECTIONS.has(requestedSection ?? '')
    ? (requestedSection as 'general' | 'members')
    : 'general';

  const [project, summary] = await Promise.all([
    getProjectById(id),
    getProjectSettingsSummary(id),
  ]);

  if (!project.success) {
    notFound();
  }

  const metrics = summary.success
    ? summary.data
    : {
        environmentCount: 0,
        componentCount: 0,
        memberCount: 0,
        featureFlagCount: 0,
      };

  const stats = [
    {
      label: 'Team members',
      value: metrics.memberCount,
      icon: UsersIcon,
      hint: 'People with access to this project',
    },
    {
      label: 'Environments',
      value: metrics.environmentCount,
      icon: Layers,
      hint: 'Environments currently configured',
    },
    {
      label: 'Active components',
      value: metrics.componentCount,
      icon: LayoutGrid,
      hint: 'Components deployed across environments',
    },
    {
      label: 'Feature flags',
      value: metrics.featureFlagCount,
      icon: Flag,
      hint: 'Flags defined within this project',
    },
  ];

  const projectSettingsPath = `/projects/${id}/settings`;

  return (
    <div className="flex flex-1 flex-col space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {project.data.name}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {project.data.description ||
              'Configure your project, manage membership, and review access.'}
          </p>
        </div>
      </div>

      <Tabs value={section} defaultValue="general" className="space-y-8">
        <TabsList>
          <TabsTrigger value="general" asChild>
            <Link href={`${projectSettingsPath}?section=general`}>General</Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <Link href={`${projectSettingsPath}?section=members`}>Members</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="shadow-none">
                <CardContent className="flex items-center gap-4 px-6 py-6">
                  <div className="inline-flex size-10 items-center justify-center rounded-full bg-muted">
                    <stat.icon className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-semibold leading-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {stat.hint}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
              <CardDescription>
                Update the name, description, and other high-level details for
                this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProjectsForm project={project.data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Immutable identifiers you might need for integrations or API
                access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Project ID</dt>
                  <dd>
                    <code className="mt-1 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {project.data.id}
                    </code>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-8">
          <Card className="shadow-none border-none">
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage who has access to this project and their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <ProjectMemberList id={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
