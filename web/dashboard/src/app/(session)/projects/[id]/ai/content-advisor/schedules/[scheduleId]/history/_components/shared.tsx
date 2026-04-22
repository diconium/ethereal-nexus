import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, XCircle, Zap } from 'lucide-react';

export function getSingleParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDuration(
  startValue: Date | string,
  endValue: Date | string | null | undefined,
) {
  if (!endValue) return '—';
  const diffMs = new Date(endValue).getTime() - new Date(startValue).getTime();
  if (diffMs <= 0) return '—';
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

export function RunStatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        Completed
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300">
        <XCircle className="mr-1 size-3" />
        Failed
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

export function TriggerBadge({ triggeredBy }: { triggeredBy: string }) {
  if (triggeredBy === 'manual') {
    return (
      <Badge variant="outline" className="text-[11px]">
        <User className="mr-1 size-3" />
        Manual
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-violet-500/30 text-[11px] text-violet-700 dark:text-violet-300"
    >
      <Zap className="mr-1 size-3" />
      Automatic
    </Badge>
  );
}
