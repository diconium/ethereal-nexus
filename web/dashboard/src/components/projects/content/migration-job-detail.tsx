'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  CircleOff,
  Clock,
  Download,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cmsLogoByKey, type CmsId } from './cms-logos';
import { getCmsConnectorLabel, type CmsConnectorKey } from '@/data/cms/config';
import { getProvisionJob, runProvisionJob } from '@/data/meta/provision/actions';
import type { ProvisionJobView } from '@/data/meta/provision/dto';

const POLL_MS = 1500;

function opIcon(status: string) {
  if (status === 'created' || status === 'updated')
    return <CheckCircle2 className="size-4 text-green-600" />;
  if (status === 'failed')
    return <CircleAlert className="size-4 text-red-500" />;
  return <CircleOff className="size-4 text-muted-foreground" />;
}

export function MigrationJobDetail({
  projectId,
  initialJob,
}: {
  projectId: string;
  initialJob: ProvisionJobView;
}) {
  const searchParams = useSearchParams();
  const env = searchParams.get('env');
  const qs = env ? `?env=${env}` : '';
  const [job, setJob] = useState<ProvisionJobView>(initialJob);
  const startedRef = useRef(false);
  const done = job.status === 'completed' || job.status === 'failed';

  const refresh = useCallback(async () => {
    const r = await getProvisionJob(initialJob.id);
    if (r.success) setJob(r.data);
    return r.success ? r.data.status : null;
  }, [initialJob.id]);

  // Trigger the run once if the job is still pending.
  useEffect(() => {
    if (startedRef.current) return;
    if (initialJob.status !== 'pending') return;
    startedRef.current = true;
    (async () => {
      await runProvisionJob(initialJob.id);
      await refresh();
    })();
  }, [initialJob.id, initialJob.status, refresh]);

  // Poll until the job finishes.
  useEffect(() => {
    if (done) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [done, refresh]);

  const Logo = job.targetProvider
    ? cmsLogoByKey[job.targetProvider as CmsId]
    : null;
  const base = `/projects/${projectId}/content/migration-jobs`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`${base}${qs}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Migration Jobs
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {Logo ? <Logo className="size-10 shrink-0" /> : null}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {job.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Target: {job.targetConnectionName ?? '—'}
                {job.targetProvider
                  ? ` (${getCmsConnectorLabel(job.targetProvider as CmsConnectorKey)})`
                  : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!done ? (
              <Badge variant="warning" className="gap-1">
                <LoaderCircle className="size-3 animate-spin" />
                {job.status === 'pending' ? 'Starting…' : 'Running…'}
              </Badge>
            ) : job.status === 'completed' ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="size-3" /> Completed
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="size-3" /> Failed
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refresh()}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Content types" value={job.contentTypeCount} />
        <SummaryCard
          label="Created"
          value={job.result?.created ?? 0}
          tint="text-green-600"
        />
        <SummaryCard
          label="Updated"
          value={job.result?.updated ?? 0}
          tint="text-blue-600"
        />
        <SummaryCard
          label="Failed"
          value={job.result?.failed ?? 0}
          tint="text-red-600"
        />
      </div>

      {job.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {job.error}
        </div>
      ) : null}

      {/* Operations */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-2.5 text-sm font-semibold">
          Operations
        </div>
        {job.operations.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
            {done ? (
              'No operations were performed.'
            ) : (
              <>
                <Clock className="size-4" /> Waiting for the job to run…
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {job.operations.map((op) => (
              <li key={op.key} className="flex items-center gap-3 px-4 py-3">
                {opIcon(op.status)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{op.key}</p>
                  {op.message ? (
                    <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {op.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {op.published ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Published
                    </Badge>
                  ) : null}
                  <span
                    className={cn(
                      'text-xs capitalize',
                      op.status === 'failed'
                        ? 'text-red-600'
                        : 'text-muted-foreground',
                    )}
                  >
                    {op.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {job.status === 'completed' && job.result?.message ? (
        <StrapiSchemaDownload
          message={job.result.message}
          jobName={job.name}
          provider={job.targetProvider}
        />
      ) : job.status === 'completed' ? (
        <p className="text-sm text-muted-foreground">
          Structure provisioned. Open your target CMS to see the newly created
          content types.
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold', tint)}>{value}</p>
    </div>
  );
}

/**
 * Shown when the provision result message contains a Strapi schema JSON bundle.
 * Lets the user download it and explains how to import it in the Strapi UI.
 */
function StrapiSchemaDownload({
  message,
  jobName,
  provider,
}: {
  message: string;
  jobName: string;
  provider: string | null;
}) {
  // Only show for Strapi and only when message looks like JSON
  if (provider !== 'strapi') return null;
  let isJson = false;
  try { JSON.parse(message); isJson = true; } catch { /* not JSON */ }
  if (!isJson) return null;

  function handleDownload() {
    const blob = new Blob([message], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobName.replace(/\s+/g, '-').toLowerCase()}-strapi-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            Strapi Schema Generated
          </p>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            The schema could not be applied automatically — Strapi v5&apos;s
            Content-Type Builder write API requires an admin session. Download
            the generated schema and import it via the Strapi admin UI:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-700 dark:text-blue-400">
            <li>Download the schema file below</li>
            <li>Open the Strapi admin panel</li>
            <li>
              Go to{' '}
              <span className="font-medium">
                Content-Type Builder → Import
              </span>
            </li>
            <li>Paste or upload the downloaded JSON file</li>
          </ol>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          <Download className="size-3.5" />
          Download Schema
        </Button>
      </div>
    </div>
  );
}
