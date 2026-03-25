import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
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
  getEnvironmentsByProject,
  getProjectSettingsSummary,
} from '@/data/projects/actions';
import ProjectsForm from '@/components/projects/project-form';
import { ProjectMemberList } from '@/components/projects/members-table/member-list';
import {
  Layers,
  LayoutGrid,
  Flag,
  Users as UsersIcon,
  Bot,
  CalendarClock,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import {
  getChatbotsByEnvironment,
  getContentAdvisorAgentConfigs,
  getContentAdvisorSchedules,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { EnvironmentSwitcher } from '@/components/projects/ai/environment-switcher';
import { FeatureFlagsSection } from '@/components/projects/ai/feature-flags-section';
import { ContentAdvisorAgentConfigSection } from '@/components/projects/ai/content-advisor-agent-config-section';
import { ContentAdvisorSchedulesSection } from '@/components/projects/ai/content-advisor-schedules-section';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SETTINGS_SECTIONS = new Set(['general', 'members', 'ai']);

function Section({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:content-none">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-4">{children}</div>
    </details>
  );
}

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
  const query = await searchParams;

  const requestedSection = Array.isArray(query?.section)
    ? query?.section[0]
    : query?.section;
  const env = Array.isArray(query?.env) ? query?.env[0] : query?.env;
  const section = SETTINGS_SECTIONS.has(requestedSection ?? '')
    ? (requestedSection as 'general' | 'members' | 'ai')
    : 'general';

  const [project, summary, environments] = await Promise.all([
    getProjectById(id),
    getProjectSettingsSummary(id),
    getEnvironmentsByProject(id),
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
  const selectedEnvironment = environments.success
    ? environments.data.find((environment) => environment.id === env) ||
      environments.data[0]
    : null;
  const settingsHref = (nextSection: 'general' | 'members' | 'ai') =>
    `${projectSettingsPath}?section=${nextSection}${selectedEnvironment ? `&env=${selectedEnvironment.id}` : ''}`;

  const [aiFlags, chatbots, contentAdvisorAgents, contentAdvisorSchedules] =
    section === 'ai' && selectedEnvironment
      ? await Promise.all([
          getProjectAiFlags(id, selectedEnvironment.id),
          getChatbotsByEnvironment(id, selectedEnvironment.id),
          getContentAdvisorAgentConfigs(id, selectedEnvironment.id),
          getContentAdvisorSchedules(id, selectedEnvironment.id),
        ])
      : [null, null, null, null];

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
            <Link href={settingsHref('general')}>General</Link>
          </TabsTrigger>
          <TabsTrigger value="members" asChild>
            <Link href={settingsHref('members')}>Members</Link>
          </TabsTrigger>
          <TabsTrigger value="ai" asChild>
            <Link href={settingsHref('ai')}>Agentic AI</Link>
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

        <TabsContent value="ai" className="space-y-8">
          {!selectedEnvironment ? (
            <AiErrorNotice
              title="AI settings need an environment"
              message="Select an environment to configure AI features, Content Advisor agents, and schedules."
            />
          ) : !aiFlags ||
            !chatbots ||
            !contentAdvisorAgents ||
            !contentAdvisorSchedules ? null : !aiFlags.success ||
            !chatbots.success ||
            !contentAdvisorAgents.success ||
            !contentAdvisorSchedules.success ? (
            <AiErrorNotice
              title="Unable to load AI settings"
              message={
                !aiFlags.success
                  ? aiFlags.error.message
                  : !chatbots.success
                    ? chatbots.error.message
                    : !contentAdvisorAgents.success
                      ? contentAdvisorAgents.error.message
                      : !contentAdvisorSchedules.success
                        ? contentAdvisorSchedules.error.message
                        : 'Failed to load AI settings.'
              }
            />
          ) : (
            <>
              <Section
                icon={SlidersHorizontal}
                title="AI features"
                description="Enable or disable the AI sections available in the selected environment."
                defaultOpen
              >
                <FeatureFlagsSection
                  key={`ai-flags-${selectedEnvironment.id}`}
                  projectId={id}
                  environmentId={selectedEnvironment.id}
                  flags={aiFlags.data}
                />
              </Section>

              <Section
                icon={Bot}
                title="Content Advisor agents"
                description="Configure the AI agents used for content analysis in the current environment."
              >
                <ContentAdvisorAgentConfigSection
                  key={`advisor-agents-${selectedEnvironment.id}`}
                  projectId={id}
                  environmentId={selectedEnvironment.id}
                  initialAgents={contentAdvisorAgents.data}
                />
              </Section>

              <Section
                icon={CalendarClock}
                title="Content Advisor schedules"
                description="Automate content analysis with cron-based schedules for the current environment."
              >
                <ContentAdvisorSchedulesSection
                  key={`advisor-schedules-${selectedEnvironment.id}`}
                  projectId={id}
                  environmentId={selectedEnvironment.id}
                  initialSchedules={contentAdvisorSchedules.data}
                />
              </Section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
