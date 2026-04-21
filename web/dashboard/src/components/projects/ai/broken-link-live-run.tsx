'use client';

import { useCallback, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Play,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BrokenLinkCrawlEvent } from '@/app/api/projects/[id]/ai/content-advisor/broken-link-crawl/route';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LinkStatus = 'pending' | 'ok' | 'broken' | 'error';

type LinkEntry = {
  url: string;
  status: LinkStatus;
  httpStatus: number | null;
  foundOn: string | null;
  ancestorComponent: string | null;
};

type SourceInfo = {
  url: string;
  status: number;
  title: string | null;
  linkCount: number;
};

type CrawlState =
  | { phase: 'idle' }
  | { phase: 'crawling'; abortController: AbortController }
  | {
      phase: 'done';
      summary: string;
      brokenCount: number;
      totalChecked: number;
    }
  | { phase: 'error'; message: string };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  projectId: string;
  environmentId: string;
  scheduleId: string;
  agentConfigId: string;
  page: string;
  /** Called when the crawl finishes so the parent can trigger the full run+persist flow */
  onRunRequested: () => void;
  isRunPending: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: LinkStatus) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
    case 'broken':
      return <XCircle className="size-3.5 shrink-0 text-destructive" />;
    case 'error':
      return <TriangleAlert className="size-3.5 shrink-0 text-amber-500" />;
    default:
      return (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      );
  }
}

function statusBadge(status: LinkStatus, httpStatus: number | null) {
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="text-[10px]">
        checking
      </Badge>
    );
  }
  if (status === 'ok') {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
      >
        {httpStatus ?? 200}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      {httpStatus === 0 ? 'timeout' : (httpStatus ?? '???')}
    </Badge>
  );
}

function httpStatusBadge(status: number) {
  const ok = status >= 200 && status < 300;
  if (ok) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
      >
        {status} OK
      </Badge>
    );
  }
  if (status === 0) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        timeout
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BrokenLinkLiveRun({
  projectId,
  environmentId,
  scheduleId,
  agentConfigId,
  page,
  onRunRequested,
  isRunPending,
}: Props) {
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [crawlState, setCrawlState] = useState<CrawlState>({ phase: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const startCrawl = useCallback(async () => {
    // Cancel any in-flight crawl
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLinks([]);
    setSourceInfo(null);
    setCrawlState({ phase: 'crawling', abortController: controller });

    try {
      const response = await fetch(
        `/api/projects/${projectId}/ai/content-advisor/broken-link-crawl`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            environmentId,
            scheduleId,
            agentConfigId,
            page,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => 'Unknown error');
        setCrawlState({ phase: 'error', message: text });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep any incomplete last line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as BrokenLinkCrawlEvent;
            handleEvent(event);
          } catch {
            // Malformed line — skip
          }
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as BrokenLinkCrawlEvent;
            handleEvent(event);
          } catch {
            // Malformed line — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setCrawlState({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    function handleEvent(event: BrokenLinkCrawlEvent) {
      if (event.type === 'source') {
        setSourceInfo({
          url: event.url,
          status: event.status,
          title: event.title,
          linkCount: event.linkCount,
        });
      } else if (event.type === 'links') {
        setLinks((prev) => {
          const existing = new Set(prev.map((l) => l.url));
          const newEntries: LinkEntry[] = event.urls
            .filter((u) => !existing.has(u))
            .map((u) => ({ url: u, status: 'pending', httpStatus: null, foundOn: null, ancestorComponent: null }));
          return newEntries.length > 0 ? [...prev, ...newEntries] : prev;
        });
      } else if (event.type === 'checked') {
        setLinks((prev) =>
          prev.map((l) =>
            l.url === event.url
              ? {
                  ...l,
                  status: event.ok
                    ? 'ok'
                    : event.status === 0
                      ? 'error'
                      : 'broken',
                  httpStatus: event.status,
                  foundOn: event.foundOn ?? l.foundOn,
                  ancestorComponent: event.ancestorComponent ?? l.ancestorComponent,
                }
              : l,
          ),
        );
      } else if (event.type === 'done') {
        setCrawlState({
          phase: 'done',
          summary: event.summary,
          brokenCount: event.brokenCount,
          totalChecked: event.totalChecked,
        });
      }
    }
  }, [projectId, environmentId, scheduleId, agentConfigId, page]);

  const isCrawling = crawlState.phase === 'crawling';
  const isDone = crawlState.phase === 'done';
  const isIdle = crawlState.phase === 'idle';

  const checkedCount = links.filter((l) => l.status !== 'pending').length;
  const brokenLinks = links.filter(
    (l) => l.status === 'broken' || l.status === 'error',
  );

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------- */}
      {/* Controls */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isCrawling}
          onClick={startCrawl}
        >
          {isCrawling ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Crawling…
            </>
          ) : (
            <>
              <Play className="size-4" /> Preview links
            </>
          )}
        </Button>

        {(isDone || (isCrawling && links.length > 0)) && (
          <Button
            type="button"
            disabled={isRunPending || isCrawling}
            onClick={onRunRequested}
          >
            {isRunPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving run…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Save &amp; persist run
              </>
            )}
          </Button>
        )}

        {isCrawling && links.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Checked {checkedCount} / {links.length}…
          </span>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Source page status row */}
      {/* ---------------------------------------------------------------- */}
      {sourceInfo && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
            Source page
          </span>
          <a
            href={sourceInfo.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex min-w-0 items-center gap-1 font-mono text-foreground hover:underline truncate"
            title={sourceInfo.url}
          >
            {sourceInfo.title ? (
              <span className="font-medium text-foreground">{sourceInfo.title}</span>
            ) : (
              <span className="text-muted-foreground truncate">{sourceInfo.url}</span>
            )}
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          {httpStatusBadge(sourceInfo.status)}
          <span className="text-muted-foreground">
            {sourceInfo.linkCount} link{sourceInfo.linkCount === 1 ? '' : 's'} found
          </span>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Summary bar */}
      {/* ---------------------------------------------------------------- */}
      {isDone && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium',
            crawlState.brokenCount > 0
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          )}
        >
          {crawlState.brokenCount > 0 ? (
            <XCircle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          {crawlState.summary}
        </div>
      )}

      {crawlState.phase === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="size-4 shrink-0" />
          {crawlState.message}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Link list */}
      {/* ---------------------------------------------------------------- */}
      {links.length > 0 && (
        <div className="overflow-hidden rounded-xl border">
          {/* Header */}
          <div className="grid grid-cols-[1fr_minmax(140px,22%)_90px_72px] gap-2 border-b bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div>URL</div>
            <div>Found on</div>
            <div>Status</div>
            <div className="text-right">Code</div>
          </div>

          {/* Rows */}
          <div className="max-h-[480px] divide-y overflow-y-auto">
            {links.map((link) => (
              <div
                key={link.url}
                className={cn(
                  'grid grid-cols-[1fr_minmax(140px,22%)_90px_72px] items-center gap-2 px-4 py-2 text-xs transition-colors',
                  link.status === 'ok' && 'bg-emerald-500/5',
                  (link.status === 'broken' || link.status === 'error') &&
                    'bg-destructive/5',
                  link.status === 'pending' && 'bg-background',
                )}
              >
                {/* URL + web component context */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {statusIcon(link.status)}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="min-w-0 truncate font-mono text-foreground hover:underline"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                  </div>
                  {link.ancestorComponent && (
                    <span className="ml-5 inline-flex w-fit items-center rounded border border-border bg-muted/40 px-1.5 py-px font-mono text-[10px] text-muted-foreground">
                      &lt;{link.ancestorComponent}&gt;
                    </span>
                  )}
                </div>

                {/* Found on */}
                <div className="min-w-0">
                  {link.foundOn ? (
                    <a
                      href={link.foundOn}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate font-mono text-[10px] text-muted-foreground hover:underline"
                      title={link.foundOn}
                    >
                      {link.foundOn}
                    </a>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Status label */}
                <div>
                  {link.status === 'pending' ? (
                    <span className="text-[10px] text-muted-foreground">
                      <Clock3 className="mr-1 inline size-3" />
                      queued
                    </span>
                  ) : link.status === 'ok' ? (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      OK
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-destructive">
                      Broken
                    </span>
                  )}
                </div>

                {/* HTTP code badge */}
                <div className="text-right">
                  {statusBadge(link.status, link.httpStatus)}
                </div>
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            <span>
              {links.length} link{links.length === 1 ? '' : 's'} discovered
            </span>
            {brokenLinks.length > 0 && (
              <span className="font-medium text-destructive">
                {brokenLinks.length} broken
              </span>
            )}
            {checkedCount > 0 && brokenLinks.length === 0 && isDone && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                All OK
              </span>
            )}
          </div>
        </div>
      )}

      {isIdle && (
        <p className="text-xs text-muted-foreground">
          Click <strong>Preview links</strong> to gather and validate all links
          found on this page. Results appear live as each link is checked. Click{' '}
          <strong>Save &amp; persist run</strong> when ready to store the
          findings.
        </p>
      )}
    </div>
  );
}
