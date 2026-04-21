'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  PlusCircle,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  upsertContentAdvisorAgentConfig,
  upsertBrokenLinkAgentConfig,
} from '@/data/ai/actions';
import type { ContentAdvisorAgentConfig } from '@/data/ai/dto';
import { CONTENT_ADVISOR_AGENT_CATALOG } from '@/data/ai/content-advisor';
import { AI_PROVIDER_OPTIONS, type AiProvider } from '@/data/ai/provider';
import { toast } from 'sonner';

type ProviderCfg = {
  project_endpoint?: string;
  agent_id?: string;
  crawl_depth?: number;
  allowed_domain?: string;
};

function parseProviderCfg(config: unknown): ProviderCfg | null | undefined {
  return config as ProviderCfg | null | undefined;
}

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
    'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
};

function badgeClass(key: string) {
  return (
    AGENT_BADGE_STYLES[key] ??
    'border-muted-foreground/20 bg-muted text-muted-foreground'
  );
}

type Props = {
  projectId: string;
  environmentId: string;
  initialAgents: ContentAdvisorAgentConfig[];
};

export function ContentAdvisorAgentConfigSection({
  projectId,
  environmentId,
  initialAgents,
}: Props) {
  const [agents, setAgents] = useState(initialAgents);

  useEffect(() => {
    setAgents(initialAgents);
  }, [environmentId, initialAgents]);

  return (
    <div className="space-y-4">
      {CONTENT_ADVISOR_AGENT_CATALOG.map((entry) => {
        const agent = agents.find((item) => item.key === entry.key);
        if (entry.key === 'compliance') {
          return (
            <ComingSoonAgentRow
              key={`${environmentId}-${entry.key}`}
              catalogEntry={entry}
            />
          );
        }
        return (
          <AgentRow
            key={`${environmentId}-${entry.key}`}
            projectId={projectId}
            environmentId={environmentId}
            catalogEntry={entry}
            agent={agent}
            onSaved={(nextAgent) => {
              setAgents((current) => {
                const exists = current.some(
                  (item) => item.key === nextAgent.key,
                );
                return exists
                  ? current.map((item) =>
                      item.key === nextAgent.key ? nextAgent : item,
                    )
                  : [...current, nextAgent];
              });
            }}
          />
        );
      })}
    </div>
  );
}

function ComingSoonAgentRow({
  catalogEntry,
}: {
  catalogEntry: (typeof CONTENT_ADVISOR_AGENT_CATALOG)[number];
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 opacity-70">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0">
          <Clock size={16} className="text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {catalogEntry.name}
            </span>
            <Badge
              variant="outline"
              className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ${badgeClass(catalogEntry.key)}`}
            >
              {catalogEntry.name}
            </Badge>
            <Badge
              variant="outline"
              className="border-muted-foreground/30 text-[11px] text-muted-foreground"
            >
              <Clock className="mr-1 size-3" />
              Coming soon
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {catalogEntry.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function AgentRow({
  projectId,
  environmentId,
  catalogEntry,
  agent,
  onSaved,
}: {
  projectId: string;
  environmentId: string;
  catalogEntry: (typeof CONTENT_ADVISOR_AGENT_CATALOG)[number];
  agent?: ContentAdvisorAgentConfig;
  onSaved: (agent: ContentAdvisorAgentConfig) => void;
}) {
  const isBrokenLink = catalogEntry.key === 'broken-link';

  const providerCfg = parseProviderCfg(agent?.provider_config);

  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(agent?.enabled ?? true);
  const [provider, setProvider] = useState<AiProvider>(
    agent?.provider || 'microsoft-foundry',
  );
  const [projectEndpoint, setProjectEndpoint] = useState(
    providerCfg?.project_endpoint || '',
  );
  const [providerAgentId, setProviderAgentId] = useState(
    providerCfg?.agent_id || '',
  );
  const [crawlDepth, setCrawlDepth] = useState<number>(
    providerCfg?.crawl_depth ?? 1,
  );
  const [allowedDomain, setAllowedDomain] = useState(
    providerCfg?.allowed_domain || '',
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const cfg = parseProviderCfg(agent?.provider_config);
    setProvider(agent?.provider || 'microsoft-foundry');
    setProjectEndpoint(cfg?.project_endpoint || '');
    setProviderAgentId(cfg?.agent_id || '');
    setCrawlDepth(cfg?.crawl_depth ?? 1);
    setAllowedDomain(cfg?.allowed_domain || '');
  }, [agent?.id, agent?.updated_at]);

  // Keep the enabled toggle in sync with the agent record separately so that
  // a quick enable/disable cycle that only changes `updated_at` still resets it.
  useEffect(() => {
    setEnabled(agent?.enabled ?? true);
  }, [agent?.id]);

  const isConfigured = Boolean(agent);
  const statusCopy = useMemo(() => {
    if (!agent) {
      return 'Not configured';
    }
    return agent.enabled ? 'Enabled' : 'Disabled';
  }, [agent]);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isConfigured
          ? 'border-border bg-card'
          : 'border-dashed border-border bg-muted/20'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0">
          {isConfigured ? (
            <CheckCircle2
              size={16}
              className={
                agent?.enabled ? 'text-emerald-500' : 'text-muted-foreground'
              }
            />
          ) : (
            <PlusCircle size={16} className="text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {catalogEntry.name}
            </span>
            <Badge
              variant="outline"
              className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ${badgeClass(catalogEntry.key)}`}
            >
              {catalogEntry.name}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {statusCopy}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {catalogEntry.description}
          </p>
        </div>

        {
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Settings2 size={12} />
            {isConfigured ? 'Edit' : 'Configure'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        }
      </div>

      {expanded ? (
        <div className="space-y-4 border-t px-4 py-4">
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Enabled in this environment</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>

          {isBrokenLink ? (
            // Broken-link crawler configuration — no AI provider needed
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                This agent is a <strong>rule-based crawler</strong> and does not
                use an AI provider. It fetches the configured pages, extracts
                all links, and checks each one for HTTP errors. Only links
                within the configured domain are followed.
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`${catalogEntry.key}-allowed-domain`}
                  className="text-sm font-medium"
                >
                  Allowed domain{' '}
                  <span className="font-normal text-muted-foreground">
                    (required)
                  </span>
                </label>
                <Input
                  id={`${catalogEntry.key}-allowed-domain`}
                  placeholder="example.com or https://example.com"
                  value={allowedDomain}
                  onChange={(event) => setAllowedDomain(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The crawler will only follow links whose URL starts with this
                  domain. Enter a bare hostname (e.g.{' '}
                  <code className="rounded bg-muted px-1">example.com</code>) or
                  a full origin (e.g.{' '}
                  <code className="rounded bg-muted px-1">
                    https://example.com
                  </code>
                  ). This also applies when pages from schedules are checked.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor={`${catalogEntry.key}-crawl-depth`}
                  className="text-sm font-medium"
                >
                  Crawl depth
                </label>
                <Input
                  id={`${catalogEntry.key}-crawl-depth`}
                  type="number"
                  min={1}
                  max={10}
                  value={crawlDepth}
                  onChange={(event) =>
                    setCrawlDepth(
                      Math.max(1, Math.min(10, Number(event.target.value))),
                    )
                  }
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Depth 1 checks only links found on the configured pages. Depth
                  2 also follows those links and checks their links, and so on.
                  Max depth is 10.
                </p>
              </div>
            </div>
          ) : (
            // AI-powered agent configuration
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label
                    htmlFor={`${catalogEntry.key}-provider`}
                    className="text-sm font-medium"
                  >
                    Provider
                  </label>
                  <Select
                    value={provider}
                    onValueChange={(value) => setProvider(value as AiProvider)}
                  >
                    <SelectTrigger id={`${catalogEntry.key}-provider`}>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDER_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`${catalogEntry.key}-project-endpoint`}
                    className="text-sm font-medium"
                  >
                    Project endpoint
                  </label>
                  <Input
                    id={`${catalogEntry.key}-project-endpoint`}
                    value={projectEndpoint}
                    onChange={(event) => setProjectEndpoint(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`${catalogEntry.key}-agent-id`}
                    className="text-sm font-medium"
                  >
                    Agent ID
                  </label>
                  <Input
                    id={`${catalogEntry.key}-agent-id`}
                    value={providerAgentId}
                    onChange={(event) => setProviderAgentId(event.target.value)}
                  />
                </div>
              </div>

            </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  if (isBrokenLink) {
                    const result = await upsertBrokenLinkAgentConfig({
                      id: agent?.id,
                      project_id: projectId,
                      environment_id: environmentId,
                      key: 'broken-link',
                      name: catalogEntry.name,
                      description: catalogEntry.description,
                      allowed_domain: allowedDomain,
                      crawl_depth: crawlDepth,
                      enabled,
                    });

                    if (!result.success) {
                      toast.error(
                        result.error.message ||
                          'Failed to save agent settings.',
                      );
                      return;
                    }

                    onSaved(result.data);
                    setExpanded(false);
                    toast.success(
                      `${catalogEntry.name} saved for this environment.`,
                    );
                    return;
                  }

                  const result = await upsertContentAdvisorAgentConfig({
                    id: agent?.id,
                    project_id: projectId,
                    environment_id: environmentId,
                    key: catalogEntry.key,
                    name: catalogEntry.name,
                    description: catalogEntry.description,
                    provider,
                    project_endpoint: projectEndpoint,
                    provider_agent_id: providerAgentId,
                    enabled,
                  });

                  if (!result.success) {
                    toast.error(
                      result.error.message || 'Failed to save agent settings.',
                    );
                    return;
                  }

                  onSaved(result.data);
                  setExpanded(false);
                  toast.success(
                    `${catalogEntry.name} saved for this environment.`,
                  );
                });
              }}
            >
              {isConfigured ? 'Save settings' : 'Configure agent'}
            </Button>

            {!isConfigured ? (
              <p className="text-xs text-muted-foreground">
                This creates the agent configuration for the selected
                environment only.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
