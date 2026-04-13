'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  ArrowUpDown,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Lightbulb,
  MessageSquare,
  PauseCircle,
  PlusCircle,
  Send,
  Settings2,
  Slash,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTablePagination } from '@/components/ui/data-table/data-table-pagination';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextArea } from '@/components/ui/text-area';
import {
  addContentAdvisorIssueComment,
  deleteContentAdvisorIssue,
  updateContentAdvisorIssueStatus,
} from '@/data/ai/actions';
import { CONTENT_ADVISOR_AGENT_CATALOG } from '@/data/ai/content-advisor';
import type {
  ContentAdvisorAgentConfig,
  ContentAdvisorIssueDashboardItem,
  ContentAdvisorIssueDetection,
  ContentAdvisorIssueComment,
  ContentAdvisorIssueStatus,
  ContentAdvisorRun,
  ContentAdvisorSchedule,
} from '@/data/ai/dto';

type ContentAdvisorCurrentUser = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
};

type ContentAdvisorManagerProps = {
  projectId: string;
  environmentId: string;
  agents: ContentAdvisorAgentConfig[];
  schedules: ContentAdvisorSchedule[];
  issues: ContentAdvisorIssueDashboardItem[];
  latestRun?: ContentAdvisorRun | null;
  runSummary?: string | null;
  currentUser: ContentAdvisorCurrentUser;
};

type IssueSortKey = 'status' | 'severity' | 'lastSeen' | 'detections';
type IssueSortDirection = 'asc' | 'desc';

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

const ISSUE_SEVERITY_BADGE: Record<
  string,
  'destructive' | 'warning' | 'outline'
> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'outline',
};

const ISSUE_STATUS_META: Record<
  ContentAdvisorIssueStatus,
  {
    label: string;
    shortLabel: string;
    icon: typeof Clock3;
    className: string;
  }
> = {
  open: {
    label: 'To do',
    shortLabel: 'To do',
    icon: PauseCircle,
    className:
      'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200',
  },
  'in-progress': {
    label: 'In progress',
    shortLabel: 'In progress',
    icon: Clock3,
    className:
      'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  done: {
    label: 'Done',
    shortLabel: 'Done',
    icon: CheckCircle2,
    className:
      'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  'wont-do': {
    label: "Won't do",
    shortLabel: "Won't do",
    icon: Slash,
    className:
      'border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  },
};

function getAgentBadgeClass(agentKey: string) {
  return (
    AGENT_BADGE_STYLES[agentKey] ??
    'border-muted-foreground/20 bg-muted text-muted-foreground'
  );
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function IssueLocationNote({
  pagePath,
  componentPath,
}: {
  pagePath?: string | null;
  componentPath?: string | null;
}) {
  if (!pagePath && !componentPath) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
      {pagePath ? (
        <p>
          Page path:{' '}
          <span className="font-mono text-foreground">{pagePath}</span>
        </p>
      ) : null}
      {componentPath ? (
        <p className={pagePath ? 'mt-1' : ''}>
          Component path:{' '}
          <span className="font-mono text-foreground">{componentPath}</span>
        </p>
      ) : null}
    </div>
  );
}

function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function IssueFreshnessBadge({
  issue,
}: {
  issue: ContentAdvisorIssueDashboardItem;
}) {
  if (issue.is_detected_in_latest_run) {
    return <Badge variant="default">Detected in latest run</Badge>;
  }

  return <Badge variant="secondary">Not seen recently</Badge>;
}

function SortHeaderButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={onClick}
    >
      <span>{label}</span>
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

function IssueTimeline({
  detections,
}: {
  detections: ContentAdvisorIssueDetection[];
}) {
  if (!detections.length) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-muted/10 p-5">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>
      </div>
      <div className="space-y-3">
        {detections.map((detection) => (
          <div
            key={detection.id}
            className="rounded-xl border bg-background px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {formatDate(detection.created_at)}
              </Badge>
              <Badge variant="outline">{detection.agentRun.agent.name}</Badge>
            </div>
            <p className="mt-2 text-sm text-foreground">
              {detection.run.summary}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Agent run: {detection.agentRun.summary || 'No summary'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IssueStatusBadge({
  status,
  compact = false,
}: {
  status: ContentAdvisorIssueStatus;
  compact?: boolean;
}) {
  const meta = ISSUE_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <Icon className="size-3.5" />
      {compact ? meta.shortLabel : meta.label}
    </span>
  );
}

function IssueStatusSelect({
  projectId,
  issue,
  onIssueUpdate,
}: {
  projectId: string;
  issue: ContentAdvisorIssueDashboardItem;
  onIssueUpdate: (issue: ContentAdvisorIssueDashboardItem) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const statusMeta = ISSUE_STATUS_META[issue.status];
  const StatusIcon = statusMeta.icon;

  return (
    <Select
      value={issue.status}
      onValueChange={(value) => {
        const nextStatus = value as ContentAdvisorIssueStatus;
        if (nextStatus === issue.status) {
          return;
        }

        startTransition(async () => {
          const result = await updateContentAdvisorIssueStatus(projectId, {
            issue_id: issue.id,
            status: nextStatus,
          });

          if (!result.success) {
            toast(
              result.error.message ||
                'Failed to update content advisor issue status.',
            );
            return;
          }

          onIssueUpdate({ ...issue, status: result.data.status });
          toast(
            `Issue moved to ${ISSUE_STATUS_META[result.data.status].label}.`,
          );
        });
      }}
      disabled={isPending}
    >
      <SelectTrigger className="w-full bg-background text-left">
        <SelectValue aria-label={statusMeta.label}>
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md border ${statusMeta.className}`}
            >
              <StatusIcon className="size-4" />
            </span>
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-medium text-foreground">
                {statusMeta.label}
              </div>
              <div className="text-xs text-muted-foreground">
                Update workflow status
              </div>
            </div>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ISSUE_STATUS_META).map(([value, meta]) => (
          <SelectItem key={value} value={value}>
            {meta.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CommentAvatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  return (
    <Avatar className="size-9 border border-border/60">
      <AvatarImage src={image || undefined} alt={name} />
      <AvatarFallback className="text-xs font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentsSection({
  projectId,
  issueId,
  currentUser,
  comments,
  onCommentAdded,
}: {
  projectId: string;
  issueId: string;
  currentUser: ContentAdvisorCurrentUser;
  comments: ContentAdvisorIssueComment[];
  onCommentAdded: (comment: ContentAdvisorIssueComment) => void;
}) {
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Comments</h3>
        <Badge variant="outline" className="text-[11px]">
          {comments.length}
        </Badge>
      </div>

      {comments.length ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <CommentAvatar
                name={comment.author_name}
                image={comment.author_image}
              />
              <div className="min-w-0 flex-1 rounded-xl border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {comment.author_name}
                  </p>
                  {comment.author_user_id === currentUser.id ? (
                    <Badge variant="outline" className="text-[10px]">
                      You
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
          No comments yet. Add the first note for this issue.
        </div>
      )}

      <form
        className="flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const nextBody = body.trim();
          if (!nextBody) {
            return;
          }

          startTransition(async () => {
            const result = await addContentAdvisorIssueComment(projectId, {
              issue_id: issueId,
              body: nextBody,
            });

            if (!result.success) {
              toast(
                result.error.message ||
                  'Failed to save content advisor issue comment.',
              );
              return;
            }

            onCommentAdded(result.data);
            setBody('');
            toast('Comment added.');
          });
        }}
      >
        <CommentAvatar name={currentUser.name} image={currentUser.image} />
        <div className="flex-1 space-y-2">
          <TextArea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a comment for this issue"
            rows={3}
            disabled={isPending}
            className="bg-background"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !body.trim()}
            >
              <Send className="size-4" />
              {isPending ? 'Saving...' : 'Add comment'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function IssueDetailsDialog({
  projectId,
  issue,
  currentUser,
  open,
  onOpenChange,
  onIssueUpdate,
  onIssueDelete,
}: {
  projectId: string;
  issue: ContentAdvisorIssueDashboardItem;
  currentUser: ContentAdvisorCurrentUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueUpdate: (issue: ContentAdvisorIssueDashboardItem) => void;
  onIssueDelete: (issueId: string) => void;
}) {
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Content Advisor issue
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <IssueFreshnessBadge issue={issue} />
                <IssueStatusBadge status={issue.status} />
                <Badge
                  variant={ISSUE_SEVERITY_BADGE[issue.severity] || 'outline'}
                >
                  {issue.severity}
                </Badge>
                <Badge variant="outline">
                  {issue.issue_type.replace(/-/g, ' ')}
                </Badge>
                <Badge variant="outline">{issue.agent.name}</Badge>
                <Badge variant="outline">
                  Last seen{' '}
                  {formatDate(issue.last_detected_at || issue.created_at)}
                </Badge>
              </div>
              <DialogTitle className="text-2xl leading-tight">
                {issue.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6">
                Review the issue, update its status, inspect where it appears,
                and collaborate with comments and detection history.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={issue.page_url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <ExternalLink className="size-4" />
                  Open page
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  startDeleteTransition(async () => {
                    const result = await deleteContentAdvisorIssue(
                      projectId,
                      issue.id,
                    );
                    if (!result.success) {
                      toast(
                        result.error.message ||
                          'Failed to delete content advisor issue.',
                      );
                      return;
                    }

                    onOpenChange(false);
                    onIssueDelete(issue.id);
                    toast('Issue deleted.');
                  });
                }}
              >
                <Trash2 className="size-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="px-6 py-6">
            <div className="space-y-6">
              <section className="space-y-3 rounded-2xl border bg-background p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {issue.description}
                </p>
                <IssueLocationNote
                  pagePath={issue.page_path}
                  componentPath={issue.component_path}
                />
              </section>

              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Lightbulb className="size-4" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide">
                    Suggested fix
                  </h3>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {issue.suggestion}
                </p>
              </section>

              <section className="rounded-2xl border bg-muted/20 p-5">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    AI reasoning
                  </h3>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {issue.reasoning}
                </p>
              </section>

              <CommentsSection
                projectId={projectId}
                issueId={issue.id}
                currentUser={currentUser}
                comments={issue.comments}
                onCommentAdded={(comment) =>
                  onIssueUpdate({
                    ...issue,
                    comments: [...issue.comments, comment],
                  })
                }
              />

              <IssueTimeline detections={issue.detections} />
            </div>
          </div>

          <aside className="border-t bg-muted/10 px-6 py-6 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="mt-2">
                  <IssueStatusSelect
                    projectId={projectId}
                    issue={issue}
                    onIssueUpdate={onIssueUpdate}
                  />
                </div>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Detection history
                </p>
                <div className="mt-2 space-y-1 text-sm text-foreground">
                  <p>
                    First seen{' '}
                    {formatDate(issue.first_detected_at || issue.created_at)}
                  </p>
                  <p>
                    Last seen{' '}
                    {formatDate(issue.last_detected_at || issue.created_at)}
                  </p>
                  <p>{pluralize(issue.detection_count || 1, 'detection')}</p>
                </div>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Agent
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {issue.agent.name}
                </p>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Issue type
                </p>
                <p className="mt-2 text-sm capitalize text-foreground">
                  {issue.issue_type.replace(/-/g, ' ')}
                </p>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Page URL
                </p>
                <a
                  href={issue.page_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex break-all text-sm text-primary hover:underline"
                >
                  {issue.page_url}
                </a>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Page title
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {issue.page_title || 'No page title recorded'}
                </p>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Created
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="size-4 text-muted-foreground" />
                  {formatDate(issue.created_at)}
                </div>
                <Separator className="my-4" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Discussion
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {issue.comments.length} comment
                  {issue.comments.length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="rounded-2xl border bg-background p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location
                </h3>
                <div className="mt-3">
                  <IssueLocationNote
                    pagePath={issue.page_path}
                    componentPath={issue.component_path}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueCard({
  projectId,
  issue,
  currentUser,
  onIssueUpdate,
  onIssueDelete,
  selected,
  onSelectedChange,
}: {
  projectId: string;
  issue: ContentAdvisorIssueDashboardItem;
  currentUser: ContentAdvisorCurrentUser;
  onIssueUpdate: (issue: ContentAdvisorIssueDashboardItem) => void;
  onIssueDelete: (issueId: string) => void;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow data-state={selected ? 'selected' : undefined}>
        <TableCell>
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked === true)}
            className="size-4 rounded-sm"
            aria-label="Select issue"
          />
        </TableCell>
        <TableCell className="min-w-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-left font-medium text-foreground hover:underline"
                onClick={() => setOpen(true)}
              >
                {issue.title}
              </button>
              <IssueFreshnessBadge issue={issue} />
            </div>
            <p className="text-xs text-muted-foreground">
              {truncateText(issue.description, 90)}
            </p>
            <div className="text-[11px] text-muted-foreground">
              {issue.page_path || issue.page_url}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <IssueStatusBadge status={issue.status} compact />
        </TableCell>
        <TableCell>
          <Badge variant={ISSUE_SEVERITY_BADGE[issue.severity] || 'outline'}>
            {issue.severity}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{issue.issue_type.replace(/-/g, ' ')}</Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{issue.agent.name}</Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDate(issue.last_detected_at || issue.created_at)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {pluralize(issue.comments.length, 'comment')}
        </TableCell>
        <TableCell className="text-right">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            View
          </Button>
        </TableCell>
      </TableRow>

      <IssueDetailsDialog
        projectId={projectId}
        issue={issue}
        currentUser={currentUser}
        open={open}
        onOpenChange={setOpen}
        onIssueUpdate={onIssueUpdate}
        onIssueDelete={onIssueDelete}
      />
    </>
  );
}

export function ContentAdvisorManager({
  projectId,
  environmentId,
  agents,
  schedules,
  issues,
  latestRun,
  runSummary,
  currentUser,
}: ContentAdvisorManagerProps) {
  const [issueState, setIssueState] = useState(issues);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] =
    useState<ContentAdvisorIssueStatus>('open');
  const [sortKey, setSortKey] = useState<IssueSortKey>('lastSeen');
  const [sortDirection, setSortDirection] =
    useState<IssueSortDirection>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState('10');
  const [isBulkPending, startBulkTransition] = useTransition();
  const [summary] = useState(runSummary || 'No analysis run yet.');
  const settingsHref = `/projects/${projectId}/settings?section=ai&env=${environmentId}`;

  useEffect(() => {
    setIssueState(issues);
    setSelectedIssueIds([]);
    setPageIndex(0);
  }, [issues]);

  const orderedIssues = useMemo(
    () =>
      [...issueState]
        .filter(
          (issue) => statusFilter === 'all' || issue.status === statusFilter,
        )
        .filter(
          (issue) =>
            severityFilter === 'all' || issue.severity === severityFilter,
        )
        .filter(
          (issue) =>
            issueTypeFilter === 'all' || issue.issue_type === issueTypeFilter,
        )
        .filter(
          (issue) => agentFilter === 'all' || issue.agent.key === agentFilter,
        )
        .sort((left, right) => {
          const statusOrder: Record<ContentAdvisorIssueStatus, number> = {
            open: 0,
            'in-progress': 1,
            done: 2,
            'wont-do': 3,
          };
          const severityOrder: Record<string, number> = {
            critical: 0,
            warning: 1,
            info: 2,
          };

          let comparison = 0;
          if (sortKey === 'status') {
            comparison = statusOrder[left.status] - statusOrder[right.status];
          } else if (sortKey === 'severity') {
            comparison =
              (severityOrder[left.severity] ?? 99) -
              (severityOrder[right.severity] ?? 99);
          } else if (sortKey === 'detections') {
            comparison =
              (left.detection_count || 0) - (right.detection_count || 0);
          } else {
            comparison =
              new Date(left.last_detected_at || left.created_at).getTime() -
              new Date(right.last_detected_at || right.created_at).getTime();
          }

          return sortDirection === 'asc' ? comparison : -comparison;
        }),
    [
      agentFilter,
      issueState,
      issueTypeFilter,
      severityFilter,
      sortDirection,
      sortKey,
      statusFilter,
    ],
  );

  const pageSizeNumber = Number(pageSize) || 10;
  const pageCount = Math.max(
    1,
    Math.ceil(orderedIssues.length / pageSizeNumber),
  );
  const paginatedIssues = orderedIssues.slice(
    pageIndex * pageSizeNumber,
    pageIndex * pageSizeNumber + pageSizeNumber,
  );
  const paginationTable = {
    getState: () => ({ pagination: { pageIndex, pageSize: pageSizeNumber } }),
    getPageCount: () => pageCount,
    getCanPreviousPage: () => pageIndex > 0,
    getCanNextPage: () => pageIndex < pageCount - 1,
    options: {
      onPaginationChange: ({
        pageIndex,
        pageSize,
      }: {
        pageIndex: number;
        pageSize: number;
      }) => {
        setPageIndex(pageIndex);
        setPageSize(String(pageSize));
      },
    },
  };

  const selectedVisibleIssueIds = paginatedIssues
    .map((issue) => issue.id)
    .filter((id) => selectedIssueIds.includes(id));

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  function toggleSort(nextKey: IssueSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(
      nextKey === 'lastSeen' || nextKey === 'detections' ? 'desc' : 'asc',
    );
  }

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
        <div className="space-y-4">
          <div className="space-y-1">
            <CardTitle>Issues</CardTitle>
            <CardDescription>
              Review persistent issues across all runs, with freshness based on
              the latest completed schedule run.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{summary}</span>
            {latestRun ? (
              <Badge variant="outline">
                Latest run{' '}
                {formatDate(latestRun.completed_at || latestRun.created_at)}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(ISSUE_STATUS_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={issueTypeFilter}
                onValueChange={setIssueTypeFilter}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Filter by issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All issue types</SelectItem>
                  {Array.from(
                    new Set(issueState.map((issue) => issue.issue_type)),
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {Array.from(
                    new Set(issueState.map((issue) => issue.agent.key)),
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {issueState.find((issue) => issue.agent.key === value)
                        ?.agent.name || value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {orderedIssues.length} issues
            </div>
          </div>

          {selectedVisibleIssueIds.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {selectedVisibleIssueIds.length} selected
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={bulkStatus}
                  onValueChange={(value) =>
                    setBulkStatus(value as ContentAdvisorIssueStatus)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Bulk status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUE_STATUS_META).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBulkPending}
                  onClick={() => {
                    startBulkTransition(async () => {
                      const results = await Promise.all(
                        selectedVisibleIssueIds.map((issueId) =>
                          updateContentAdvisorIssueStatus(projectId, {
                            issue_id: issueId,
                            status: bulkStatus,
                          }),
                        ),
                      );

                      const failed = results.find((result) => !result.success);
                      if (failed && !failed.success) {
                        toast(
                          failed.error.message ||
                            'Failed to update selected issues.',
                        );
                        return;
                      }

                      setIssueState((current) =>
                        current.map((issue) => {
                          const updated = results.find(
                            (result) =>
                              result.success && result.data.id === issue.id,
                          );
                          return updated && updated.success
                            ? { ...issue, status: updated.data.status }
                            : issue;
                        }),
                      );
                      setSelectedIssueIds([]);
                      toast('Selected issues updated.');
                    });
                  }}
                >
                  Apply status
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBulkPending}
                  onClick={() => {
                    startBulkTransition(async () => {
                      const results = await Promise.all(
                        selectedVisibleIssueIds.map((issueId) =>
                          deleteContentAdvisorIssue(projectId, issueId),
                        ),
                      );

                      const failed = results.find((result) => !result.success);
                      if (failed && !failed.success) {
                        toast(
                          failed.error.message ||
                            'Failed to delete selected issues.',
                        );
                        return;
                      }

                      setIssueState((current) =>
                        current.filter(
                          (issue) =>
                            !selectedVisibleIssueIds.includes(issue.id),
                        ),
                      );
                      setSelectedIssueIds([]);
                      toast('Selected issues deleted.');
                    });
                  }}
                >
                  Delete selected
                </Button>
              </div>
            </div>
          ) : null}

          {!schedules.length ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No schedules configured yet. Go to the settings page to configure
              Content Advisor for this environment.
            </div>
          ) : !orderedIssues.length ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No issues yet. Run one of the configured schedules from the
              settings page to scan the selected pages.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={
                            orderedIssues.length === 0
                              ? false
                              : selectedVisibleIssueIds.length ===
                                  orderedIssues.length
                                ? true
                                : selectedVisibleIssueIds.length > 0
                                  ? 'indeterminate'
                                  : false
                          }
                          onCheckedChange={(checked) => {
                            setSelectedIssueIds(
                              checked === true
                                ? paginatedIssues.map((issue) => issue.id)
                                : [],
                            );
                          }}
                          className="size-4 rounded-sm"
                          aria-label="Select all visible issues"
                        />
                      </TableHead>
                      <TableHead className="w-[36%]">Issue</TableHead>
                      <TableHead>
                        <SortHeaderButton
                          label="Status"
                          onClick={() => toggleSort('status')}
                        />
                      </TableHead>
                      <TableHead>
                        <SortHeaderButton
                          label="Severity"
                          onClick={() => toggleSort('severity')}
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>
                        <SortHeaderButton
                          label="Last seen"
                          onClick={() => toggleSort('lastSeen')}
                        />
                      </TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedIssues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        projectId={projectId}
                        issue={issue}
                        currentUser={currentUser}
                        onIssueUpdate={(updatedIssue) => {
                          setIssueState((current) =>
                            current.map((item) =>
                              item.id === updatedIssue.id ? updatedIssue : item,
                            ),
                          );
                        }}
                        onIssueDelete={(issueId) => {
                          setIssueState((current) =>
                            current.filter((item) => item.id !== issueId),
                          );
                          setSelectedIssueIds((current) =>
                            current.filter((id) => id !== issueId),
                          );
                        }}
                        selected={selectedIssueIds.includes(issue.id)}
                        onSelectedChange={(checked) => {
                          setSelectedIssueIds((current) =>
                            checked
                              ? [...new Set([...current, issue.id])]
                              : current.filter((id) => id !== issue.id),
                          );
                        }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination table={paginationTable} />
            </div>
          )}
        </div>
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
