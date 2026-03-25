'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ContentAdvisorAgentConfig,
  ContentAdvisorIssue,
  ContentAdvisorSchedule,
} from '@/data/ai/dto';
import { CONTENT_ADVISOR_AGENT_CATALOG } from '@/data/ai/content-advisor';
import { Bot, CircleAlert, PlusCircle, Settings2 } from 'lucide-react';

type ContentAdvisorManagerProps = {
  projectId: string;
  environmentId: string;
  agents: ContentAdvisorAgentConfig[];
  schedules: ContentAdvisorSchedule[];
  issues: ContentAdvisorIssue[];
  runSummary?: string | null;
};

const AGENT_BADGE_STYLES: Record<string, string> = {
  'seo-performance':
    'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  accessibility:
    'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  content:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  'broken-link':
    'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  compliance:
    'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const AGENT_BADGE_LABELS: Record<string, string> = {
  'seo-performance': 'SEO',
  accessibility: 'A11y',
  content: 'Content',
  'broken-link': 'Links',
  compliance: 'Compliance',
};

function getAgentBadgeClass(agentKey: string) {
  return (
    AGENT_BADGE_STYLES[agentKey] ??
    'border-muted-foreground/20 bg-muted text-muted-foreground'
  );
}

export function ContentAdvisorManager({
  projectId,
  environmentId,
  agents,
  schedules,
  issues,
  runSummary,
}: ContentAdvisorManagerProps) {
  const [issueState] = useState(issues);
  const [summary] = useState(runSummary || 'No analysis run yet.');
  const settingsHref = `/projects/${projectId}/settings?section=ai&env=${environmentId}`;

  return (
    <Tabs defaultValue="issues" className="space-y-6">
      <TabsList>
        <TabsTrigger value="issues">
          <CircleAlert data-icon="inline-start" />
          Issues
        </TabsTrigger>
        <TabsTrigger value="agents">
          <Bot data-icon="inline-start" />
          Agents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="issues" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Latest run</CardTitle>
                <CardDescription>
                  The issues list only includes page-based findings from the
                  latest completed schedule run.
                </CardDescription>
              </div>
              <Link
                href={settingsHref}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Settings2 className="size-4" /> Open settings
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{summary}</p>
            {!schedules.length ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No schedules configured yet. Go to the settings page to
                configure Content Advisor for this environment.
              </div>
            ) : !issueState.length ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No issues yet. Run one of the configured schedules from the
                settings page to scan the selected pages.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {issueState.map((issue) => (
                  <div key={issue.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{issue.title}</h3>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {issue.issue_type.replace('-', ' ')}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {issue.description}
                    </p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p>
                        <strong>Page:</strong> {issue.page_url}
                      </p>
                      <p>
                        <strong>Suggestion:</strong> {issue.suggestion}
                      </p>
                      <p className="text-muted-foreground">{issue.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agents" className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">AI Agents</p>
          <p className="text-xs text-muted-foreground">
            Active agents used to analyse content. Configure and activate them
            from the settings page for the current environment.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CONTENT_ADVISOR_AGENT_CATALOG.map((catalogAgent) => {
            const configuredAgent = agents.find(
              (agent) => agent.key === catalogAgent.key,
            );

            return configuredAgent ? (
              <ConfiguredAgentCard
                key={catalogAgent.key}
                agent={configuredAgent}
                categoryLabel={catalogAgent.name}
                agentKey={catalogAgent.key}
                settingsHref={settingsHref}
              />
            ) : (
              <UnavailableAgentCard
                key={catalogAgent.key}
                title={catalogAgent.name}
                description={catalogAgent.description}
                agentKey={catalogAgent.key}
                settingsHref={settingsHref}
              />
            );
          })}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function UnavailableAgentCard({
  title,
  description,
  agentKey,
  settingsHref,
}: {
  title: string;
  description: string;
  agentKey: string;
  settingsHref: string;
}) {
  return (
    <Card className="border-dashed opacity-60 transition-opacity hover:opacity-80">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge
            variant="outline"
            className={`w-fit ${getAgentBadgeClass(agentKey)}`}
          >
            {AGENT_BADGE_LABELS[agentKey] ?? title}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link
          href={settingsHref}
          className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <PlusCircle className="size-3.5 shrink-0" />
          <span>
            Not configured for this environment. Go to the Settings page to
            configure it.
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}

function ConfiguredAgentCard({
  agent,
  categoryLabel,
  agentKey,
  settingsHref,
}: {
  agent: ContentAdvisorAgentConfig;
  categoryLabel: string;
  agentKey: string;
  settingsHref: string;
}) {
  return (
    <Card className={!agent.enabled ? 'opacity-70' : ''}>
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <Badge
            variant="outline"
            className={`w-fit ${getAgentBadgeClass(agentKey)}`}
          >
            {AGENT_BADGE_LABELS[agentKey] ?? categoryLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="text-sm text-muted-foreground">{agent.description}</p>
        <Link
          href={settingsHref}
          className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Settings2 className="size-3.5 shrink-0" />
          <span>
            {agent.enabled
              ? 'Configured for this environment and currently active. Open Settings to adjust it.'
              : 'Configured for this environment but currently disabled. Open Settings to activate it.'}
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
