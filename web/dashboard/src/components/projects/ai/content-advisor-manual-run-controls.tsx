'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BrokenLinkLiveRun } from '@/components/projects/ai/broken-link-live-run';
import { runContentAdvisorAgentForSchedulePage } from '@/data/ai/actions';
import type { ContentAdvisorAgentConfig } from '@/data/ai/dto';

type Props = {
  projectId: string;
  environmentId: string;
  scheduleId: string;
  agents: ContentAdvisorAgentConfig[];
  pages: string[];
  selectedAgentId: string;
  selectedPage: string;
};

function buildHref(
  projectId: string,
  environmentId: string,
  scheduleId: string,
  agentId: string,
  page: string,
  runId?: string,
) {
  const base = `/projects/${projectId}/settings/ai/content-advisor/run?env=${environmentId}&schedule=${scheduleId}&agent=${encodeURIComponent(agentId)}&page=${encodeURIComponent(page)}`;
  return runId ? `${base}&runId=${runId}` : base;
}

export function ContentAdvisorManualRunControls({
  projectId,
  environmentId,
  scheduleId,
  agents,
  pages,
  selectedAgentId,
  selectedPage,
}: Props) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(selectedAgentId);
  const [page, setPage] = useState(selectedPage);
  const [isPending, startTransition] = useTransition();

  const hasSelection = agentId && page;
  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId),
    [agentId, agents],
  );

  const isBrokenLink = activeAgent?.key === 'broken-link';

  /** Shared "run and persist" logic — used both by the normal button and the
   *  broken-link "Save & persist run" button. */
  function handleRun() {
    startTransition(async () => {
      const result = await runContentAdvisorAgentForSchedulePage({
        projectId,
        environmentId,
        scheduleId,
        agentConfigId: agentId,
        page,
      });

      if (!result.success) {
        toast(
          result.error.message ||
            'Failed to execute the Content Advisor agent.',
        );
        return;
      }

      toast(
        `${activeAgent?.name || 'Agent'} completed with ${result.data.issues.length} issue${result.data.issues.length === 1 ? '' : 's'}.`,
      );
      router.replace(
        buildHref(
          projectId,
          environmentId,
          scheduleId,
          agentId,
          page,
          result.data.run.id,
        ),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Agent</label>
        <div className="rounded-md border bg-background px-3 py-2">
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Configured page</label>
        <div className="rounded-md border bg-background px-3 py-2">
          <select
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          >
            {pages.map((pageOption) => (
              <option key={pageOption} value={pageOption}>
                {pageOption}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Send one of the configured schedule pages to the selected agent.
          Relative AEM paths like `/content/www-dsv-entw/index` are supported.
        </p>
      </div>

      {isBrokenLink ? (
        /* ----------------------------------------------------------------
         * Broken-link agent: interactive live crawler UI
         * ---------------------------------------------------------------- */
        hasSelection ? (
          <BrokenLinkLiveRun
            projectId={projectId}
            environmentId={environmentId}
            scheduleId={scheduleId}
            agentConfigId={agentId}
            page={page}
            onRunRequested={handleRun}
            isRunPending={isPending}
          />
        ) : null
      ) : (
        /* ----------------------------------------------------------------
         * All other agents: original two-button layout
         * ---------------------------------------------------------------- */
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!hasSelection) return;
              router.replace(
                buildHref(projectId, environmentId, scheduleId, agentId, page),
              );
            }}
            disabled={!hasSelection || isPending}
          >
            Update selection
          </Button>
          <Button
            type="button"
            disabled={!hasSelection || isPending}
            onClick={handleRun}
          >
            <FlaskConical className="size-4" />
            {isPending ? 'Running...' : 'Run agent now'}
          </Button>
        </div>
      )}
    </div>
  );
}
