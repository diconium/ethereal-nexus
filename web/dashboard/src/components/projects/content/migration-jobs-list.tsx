'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  LoaderCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cmsLogoByKey, type CmsId } from './cms-logos';
import { getCmsConnectorLabel } from '@/data/cms/config';
import type { CmsConnectorKey } from '@/data/cms/config';
import type { ProvisionJobSummary } from '@/data/meta/provision/dto';

function StatusBadge({ status }: { status: ProvisionJobSummary['status'] }) {
  if (status === 'completed')
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" /> Completed
      </Badge>
    );
  if (status === 'failed')
    return (
      <Badge variant="destructive" className="gap-1">
        <CircleAlert className="size-3" /> Failed
      </Badge>
    );
  if (status === 'running')
    return (
      <Badge variant="warning" className="gap-1">
        <LoaderCircle className="size-3 animate-spin" /> Running
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="size-3" /> Pending
    </Badge>
  );
}

export function MigrationJobsList({
  projectId,
  jobs,
}: {
  projectId: string;
  jobs: ProvisionJobSummary[];
}) {
  const searchParams = useSearchParams();
  const env = searchParams.get('env');
  const qs = env ? `?env=${env}` : '';
  const base = `/projects/${projectId}/content/migration-jobs`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Migration Jobs</h1>
        <p className="mt-1 text-muted-foreground">
          Start, monitor and manage content migration jobs. Jobs provision your
          mapped structure into the target CMS.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-12 text-center">
          <ArrowRightLeft className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No migration jobs yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Open a mapping, choose a target connection, then use{' '}
            <span className="font-medium">Generate Provision Plan</span> to start
            a migration.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Job</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Result</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const Logo = job.targetProvider
                  ? cmsLogoByKey[job.targetProvider as CmsId]
                  : null;
                return (
                  <tr
                    key={job.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${base}/${job.id}${qs}`}
                        className="font-medium hover:underline"
                      >
                        {job.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.contentTypeCount} content type
                        {job.contentTypeCount === 1 ? '' : 's'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {Logo ? <Logo className="size-5 shrink-0" /> : null}
                        <span className="truncate">
                          {job.targetConnectionName ?? '—'}
                          {job.targetProvider ? (
                            <span className="text-muted-foreground">
                              {' '}
                              (
                              {getCmsConnectorLabel(
                                job.targetProvider as CmsConnectorKey,
                              )}
                              )
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs',
                          job.failed > 0
                            ? 'text-red-600'
                            : 'text-muted-foreground',
                        )}
                      >
                        {job.created} created · {job.updated} updated
                        {job.failed > 0 ? ` · ${job.failed} failed` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
