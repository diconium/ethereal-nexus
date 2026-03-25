'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TextArea } from '@/components/ui/text-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertContentAdvisorAgentConfig } from '@/data/ai/actions';
import type { ContentAdvisorAgentConfig } from '@/data/ai/dto';
import { CONTENT_ADVISOR_AGENT_CATALOG } from '@/data/ai/content-advisor';
import { AI_PROVIDER_OPTIONS, type AiProvider } from '@/data/ai/provider';
import { toast } from 'sonner';

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
        return (
          <AgentRow
            key={`${environmentId}-${entry.key}`}
            projectId={projectId}
            environmentId={environmentId}
            catalogEntry={entry}
            agent={agent}
            onSaved={(nextAgent) => {
              setAgents((current) => {
                const exists = current.some((item) => item.id === nextAgent.id);
                return exists
                  ? current.map((item) =>
                      item.id === nextAgent.id ? nextAgent : item,
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
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState(
    agent?.prompt || catalogEntry.defaultPrompt,
  );
  const [enabled, setEnabled] = useState(agent?.enabled ?? true);
  const [provider, setProvider] = useState<AiProvider>(
    agent?.provider || 'microsoft-foundry',
  );
  const [projectEndpoint, setProjectEndpoint] = useState(
    agent?.provider_config?.project_endpoint || '',
  );
  const [providerAgentId, setProviderAgentId] = useState(
    agent?.provider_config?.agent_id || '',
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setProvider(agent?.provider || 'microsoft-foundry');
    setProjectEndpoint(agent?.provider_config?.project_endpoint || '');
    setProviderAgentId(agent?.provider_config?.agent_id || '');
    setPrompt(agent?.prompt || catalogEntry.defaultPrompt);
    setEnabled(agent?.enabled ?? true);
  }, [agent, catalogEntry.defaultPrompt]);

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

        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Settings2 size={12} />
          {isConfigured ? 'Edit' : 'Configure'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded ? (
        <div className="space-y-4 border-t px-4 py-4">
          <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <span>Enabled in this environment</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Provider</label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as AiProvider)}
              >
                <SelectTrigger>
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
              <label className="text-sm font-medium">Project endpoint</label>
              <Input
                value={projectEndpoint}
                onChange={(event) => setProjectEndpoint(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent ID</label>
              <Input
                value={providerAgentId}
                onChange={(event) => setProviderAgentId(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Focus instruction</label>
            <TextArea
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Fine-tune what this specialist should focus on for the current
              environment.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
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
                    prompt,
                    enabled,
                  });

                  if (!result.success) {
                    toast(
                      result.error.message || 'Failed to save agent settings.',
                    );
                    return;
                  }

                  onSaved(result.data);
                  setExpanded(false);
                  toast(`${catalogEntry.name} saved for this environment.`);
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
