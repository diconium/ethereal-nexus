'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type {
  AnalyticsReviewAgentConfig,
  Chatbot,
  ChatbotAnalyticsConfig,
  ChatbotBreakdownItem,
  ChatbotQueueHealth,
  ChatbotRecentSession,
  ChatbotTimeseriesPoint,
  ChatbotTopicRule,
  ChatbotTopicRuleSet,
} from '@/data/ai/dto';
import {
  cleanupChatbotAnalyticsData,
  deleteChatbotTopicRule,
  finalizeStaleChatbotSessions,
  processChatbotUnmatchedReviewBatch,
  upsertAnalyticsReviewAgentConfig,
  upsertChatbotAnalyticsConfig,
  upsertChatbotTopicRule,
  upsertChatbotTopicRuleSet,
} from '@/data/ai/analytics-actions';

type Props = {
  projectId: string;
  environmentId: string;
  chatbot: Chatbot;
  overview: {
    session_count: number;
    request_count: number;
    avg_duration_seconds: number;
    avg_turns_per_session: number;
    success_rate: number;
    total_tokens: number;
    unmatched_rate: number;
  };
  timeseries: ChatbotTimeseriesPoint[];
  breakdown: ChatbotBreakdownItem[];
  sessions: ChatbotRecentSession[];
  queueHealth: ChatbotQueueHealth;
  analyticsConfig: ChatbotAnalyticsConfig;
  reviewAgentConfig: AnalyticsReviewAgentConfig;
  topicRuleSet: ChatbotTopicRuleSet | null;
  topicRules: ChatbotTopicRule[];
};

type TopicRuleSetDraft = {
  id?: string;
  project_id: string;
  environment_id: string;
  chatbot_id: string;
  enabled: boolean;
  default_language: string;
  minimum_confidence: number;
};

type TopicRuleDraft = typeof EMPTY_RULE & {
  id?: string;
};

const EMPTY_RULE = {
  topic_key: '',
  label: '',
  language: 'en',
  keywords: '',
  negative_keywords: '',
  priority: 100,
  enabled: true,
};

function buildDefaultRuleSetDraft(
  projectId: string,
  environmentId: string,
  chatbotId: string,
): TopicRuleSetDraft {
  return {
    project_id: projectId,
    environment_id: environmentId,
    chatbot_id: chatbotId,
    enabled: true,
    default_language: 'en',
    minimum_confidence: 60,
  };
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number) {
  if (!seconds) {
    return '0m';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function ChatbotAnalyticsDashboard({
  projectId,
  environmentId,
  chatbot,
  overview,
  timeseries,
  breakdown,
  sessions,
  queueHealth,
  analyticsConfig,
  reviewAgentConfig,
  topicRuleSet,
  topicRules,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [analyticsState, setAnalyticsState] = useState(analyticsConfig);
  const [reviewAgentState, setReviewAgentState] = useState(reviewAgentConfig);
  const [ruleSetState, setRuleSetState] = useState<TopicRuleSetDraft | null>(
    topicRuleSet
      ? {
          id: topicRuleSet.id,
          project_id: topicRuleSet.project_id,
          environment_id: topicRuleSet.environment_id,
          chatbot_id: topicRuleSet.chatbot_id,
          enabled: topicRuleSet.enabled,
          default_language: topicRuleSet.default_language,
          minimum_confidence: topicRuleSet.minimum_confidence,
        }
      : null,
  );
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<TopicRuleDraft>(EMPTY_RULE);
  const [timeRange, setTimeRange] = useState('30d');

  const filteredTimeseries = useMemo(() => {
    if (!timeseries.length) {
      return [];
    }

    const sorted = [...timeseries].sort((a, b) => a.date.localeCompare(b.date));

    if (timeRange === '1d') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => {
        const bucketDate = new Date(startOfDay);
        bucketDate.setHours(hour, 0, 0, 0);
        return {
          date: bucketDate.toISOString(),
          hourLabel: `${hour}h`,
          sessions: 0,
          requests: 0,
          total_tokens: 0,
          rate_limited: 0,
          topic_counts: {} as Record<string, number>,
        };
      });

      for (const point of sorted) {
        const pointDate = new Date(point.date);
        if (pointDate < startOfDay || pointDate > endOfDay) {
          continue;
        }

        const bucket = hourlyBuckets[pointDate.getHours()];
        bucket.sessions += point.sessions;
        bucket.requests += point.requests;
        bucket.total_tokens += point.total_tokens;
        bucket.rate_limited += point.rate_limited;
        for (const [topic, count] of Object.entries(point.topic_counts ?? {})) {
          bucket.topic_counts[topic] =
            (bucket.topic_counts[topic] ?? 0) + count;
        }
      }

      return hourlyBuckets;
    }

    const lastDate = new Date(sorted[sorted.length - 1].date);
    const start = new Date(lastDate);

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    start.setDate(start.getDate() - days);

    const buckets = new Map<
      string,
      {
        date: string;
        sessions: number;
        requests: number;
        total_tokens: number;
        rate_limited: number;
        topic_counts: Record<string, number>;
      }
    >();

    for (const point of sorted) {
      const pointDate = new Date(point.date);
      if (pointDate < start) {
        continue;
      }

      const bucketDate = new Date(pointDate);
      bucketDate.setHours(0, 0, 0, 0);
      const key = bucketDate.toISOString();
      const bucket = buckets.get(key) ?? {
        date: key,
        sessions: 0,
        requests: 0,
        total_tokens: 0,
        rate_limited: 0,
        topic_counts: {},
      };
      bucket.sessions += point.sessions;
      bucket.requests += point.requests;
      bucket.total_tokens += point.total_tokens;
      bucket.rate_limited += point.rate_limited;
      for (const [topic, count] of Object.entries(point.topic_counts ?? {})) {
        bucket.topic_counts[topic] = (bucket.topic_counts[topic] ?? 0) + count;
      }
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [timeRange, timeseries]);

  const sessionsChartConfig = {
    sessions: {
      label: 'Sessions',
      color: 'var(--chart-1)',
    },
    requests: {
      label: 'Requests',
      color: 'var(--chart-2)',
    },
  } satisfies ChartConfig;

  const topTopicSeries = useMemo(
    () =>
      breakdown.slice(0, 3).map((item, index) => ({
        key: item.key,
        dataKey: `topic:${item.key}`,
        label: item.label,
        color:
          index === 0
            ? 'var(--chart-3)'
            : index === 1
              ? 'var(--chart-4)'
              : 'var(--chart-5)',
      })),
    [breakdown],
  );

  const chartTimeseries = useMemo(
    () =>
      filteredTimeseries.map((point) => {
        const next: Record<string, string | number | Record<string, number>> = {
          ...point,
        };
        for (const topic of topTopicSeries) {
          next[topic.dataKey] = point.topic_counts?.[topic.key] ?? 0;
        }
        return next;
      }),
    [filteredTimeseries, topTopicSeries],
  );

  const combinedSessionsChartConfig = useMemo(
    () => ({
      ...sessionsChartConfig,
      ...Object.fromEntries(
        topTopicSeries.map((topic) => [
          topic.dataKey,
          {
            label: topic.label,
            color: topic.color,
          },
        ]),
      ),
    }),
    [sessionsChartConfig, topTopicSeries],
  );

  const topicChartData = useMemo(
    () =>
      breakdown.map((item) => ({ topic: item.label, sessions: item.count })),
    [breakdown],
  );

  const saveAnalyticsConfig = () => {
    startTransition(async () => {
      const result = await upsertChatbotAnalyticsConfig({
        id: analyticsState.id,
        project_id: projectId,
        environment_id: environmentId,
        chatbot_id: chatbot.id,
        llm_fallback_enabled: analyticsState.llm_fallback_enabled,
        review_min_confidence: analyticsState.review_min_confidence,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to save analytics config.');
        return;
      }
      toast('Chatbot analytics settings saved.');
      router.refresh();
    });
  };

  const saveReviewAgentConfig = () => {
    startTransition(async () => {
      const result = await upsertAnalyticsReviewAgentConfig({
        id: reviewAgentState.id,
        project_id: projectId,
        environment_id: environmentId,
        provider: 'microsoft-foundry',
        project_endpoint: reviewAgentState.provider_config.project_endpoint,
        provider_agent_id: reviewAgentState.provider_config.agent_id,
        enabled: reviewAgentState.enabled,
        taxonomy_version: reviewAgentState.taxonomy_version,
        max_batch_size: reviewAgentState.max_batch_size,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to save review agent settings.');
        return;
      }
      toast('Review agent settings saved.');
      router.refresh();
    });
  };

  const saveRuleSet = () => {
    startTransition(async () => {
      const result = await upsertChatbotTopicRuleSet({
        id: ruleSetState?.id,
        project_id: projectId,
        environment_id: environmentId,
        chatbot_id: chatbot.id,
        enabled: ruleSetState?.enabled ?? true,
        default_language: ruleSetState?.default_language || 'en',
        minimum_confidence: ruleSetState?.minimum_confidence ?? 60,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to save topic mapping settings.');
        return;
      }
      setRuleSetState(result.data);
      toast('Topic mapping settings saved.');
      router.refresh();
    });
  };

  const addRule = () => {
    startTransition(async () => {
      let currentRuleSet = ruleSetState;
      if (!currentRuleSet) {
        const created = await upsertChatbotTopicRuleSet({
          project_id: projectId,
          environment_id: environmentId,
          chatbot_id: chatbot.id,
          enabled: true,
          default_language: 'en',
          minimum_confidence: 60,
        });
        if (!created.success) {
          toast(created.error.message || 'Failed to initialize topic rules.');
          return;
        }
        currentRuleSet = created.data;
        setRuleSetState(created.data);
      }

      if (!currentRuleSet?.id) {
        toast('Topic mapping settings are missing for this chatbot.');
        return;
      }

      const result = await upsertChatbotTopicRule({
        id: ruleDraft.id,
        project_id: projectId,
        environment_id: environmentId,
        chatbot_id: chatbot.id,
        rule_set_id: currentRuleSet.id,
        topic_key: ruleDraft.topic_key,
        label: ruleDraft.label,
        language: ruleDraft.language,
        keywords: ruleDraft.keywords
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        negative_keywords: ruleDraft.negative_keywords
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        priority: Number(ruleDraft.priority),
        enabled: ruleDraft.enabled,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to save topic rule.');
        return;
      }
      setRuleDraft(EMPTY_RULE);
      setIsRuleDialogOpen(false);
      toast(`Topic rule ${ruleDraft.id ? 'updated' : 'added'}.`);
      router.refresh();
    });
  };

  const openCreateRuleDialog = () => {
    setRuleDraft(EMPTY_RULE);
    setIsRuleDialogOpen(true);
  };

  const openEditRuleDialog = (rule: ChatbotTopicRule) => {
    setRuleDraft({
      id: rule.id,
      topic_key: rule.topic_key,
      label: rule.label,
      language: rule.language,
      keywords: Array.isArray(rule.keywords) ? rule.keywords.join(', ') : '',
      negative_keywords: Array.isArray(rule.negative_keywords)
        ? rule.negative_keywords.join(', ')
        : '',
      priority: rule.priority,
      enabled: rule.enabled,
    });
    setIsRuleDialogOpen(true);
  };

  const closeRuleDialog = () => {
    setIsRuleDialogOpen(false);
    setRuleDraft(EMPTY_RULE);
  };

  const removeRule = (ruleId: string) => {
    startTransition(async () => {
      const result = await deleteChatbotTopicRule(projectId, ruleId);
      if (!result.success) {
        toast(result.error.message || 'Failed to delete topic rule.');
        return;
      }
      toast('Topic rule deleted.');
      router.refresh();
    });
  };

  const runManualProcessing = () => {
    startTransition(async () => {
      const result = await processChatbotUnmatchedReviewBatch({
        projectId,
        environmentId,
        chatbotId: chatbot.id,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to process unmatched queue.');
        return;
      }
      toast(
        `Processed unmatched queue. Classified ${result.data.classified} item(s).`,
      );
      router.refresh();
    });
  };

  const finalizeSessions = () => {
    startTransition(async () => {
      const result = await finalizeStaleChatbotSessions({
        projectId,
        environmentId,
        chatbotId: chatbot.id,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to finalize sessions.');
        return;
      }
      toast(`Finalized ${result.data.finalized} stale session(s).`);
      router.refresh();
    });
  };

  const cleanupQueue = () => {
    startTransition(async () => {
      const result = await cleanupChatbotAnalyticsData({
        projectId,
        pruneExpiredQueue: true,
      });
      if (!result.success) {
        toast(result.error.message || 'Failed to clean analytics queue.');
        return;
      }
      toast(
        `Cleaned ${result.data.expiredQueueRowsDeleted} expired review row(s).`,
      );
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="overview" className="flex flex-col gap-6">
        <TabsList className="w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="topic-mapping">Topic Mapping</TabsTrigger>
          <TabsTrigger value="review-agent">Review Agent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              title="Sessions"
              description="Distinct chatbot conversations started in the selected period."
              value={String(overview.session_count)}
            />
            <MetricCard
              title="Requests"
              description="Total successful chatbot request cycles captured across all sessions."
              value={String(overview.request_count)}
            />
            <MetricCard
              title="Avg duration"
              description="Average time between first and last activity for a chatbot session."
              value={formatDuration(Math.round(overview.avg_duration_seconds))}
            />
            <MetricCard
              title="Avg turns"
              description="Average number of user turns seen per session."
              value={overview.avg_turns_per_session.toFixed(1)}
            />
            <MetricCard
              title="Success rate"
              description="Share of sessions that appear to end in a resolved state."
              value={percent(overview.success_rate)}
            />
            <MetricCard
              title="Historical unmatched rate"
              description="Sessions in the selected range that still have no final topic classification, even if they were never queued for fallback review."
              value={percent(overview.unmatched_rate)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid gap-1">
                    <CardTitle>Sessions over time</CardTitle>
                    <CardDescription>
                      Tracks how many sessions and requests were recorded each
                      day for this chatbot.
                    </CardDescription>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger
                      className="w-[160px]"
                      aria-label="Select time range"
                    >
                      <SelectValue placeholder="Last 30 days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 1 day</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {filteredTimeseries.length ? (
                  <ChartContainer
                    config={combinedSessionsChartConfig}
                    className="aspect-auto h-[260px] w-full"
                  >
                    <AreaChart data={chartTimeseries}>
                      <defs>
                        <linearGradient
                          id="fillSessions"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-sessions)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-sessions)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillRequests"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-requests)"
                            stopOpacity={0.7}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-requests)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey={timeRange === '1d' ? 'hourLabel' : 'date'}
                        tick={{ fontSize: timeRange === '1d' ? 10 : 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={timeRange === '1d' ? 0 : 24}
                        interval={timeRange === '1d' ? 0 : 'preserveStartEnd'}
                        angle={timeRange === '1d' ? -45 : 0}
                        textAnchor={timeRange === '1d' ? 'end' : 'middle'}
                        height={timeRange === '1d' ? 56 : 30}
                        tickFormatter={(value) =>
                          timeRange === '1d'
                            ? String(value)
                            : new Date(value).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            labelFormatter={(value) =>
                              timeRange === '1d'
                                ? `${String(value)} today`
                                : new Date(String(value)).toLocaleDateString(
                                    undefined,
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                    },
                                  )
                            }
                          />
                        }
                      />
                      <Area
                        dataKey="requests"
                        type="natural"
                        fill="url(#fillRequests)"
                        stroke="var(--color-requests)"
                      />
                      <Area
                        dataKey="sessions"
                        type="natural"
                        fill="url(#fillSessions)"
                        stroke="var(--color-sessions)"
                      />
                      {topTopicSeries.map((topic) => (
                        <Line
                          key={topic.dataKey}
                          dataKey={topic.dataKey}
                          type="monotone"
                          stroke={topic.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <EmptyText text="No sessions recorded in the selected range." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Topic breakdown</CardTitle>
                <CardDescription>
                  Most common classified topics across the selected chatbot
                  sessions. This chart shows how the classified conversation mix
                  is distributed across the top detected topics.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {breakdown.length ? (
                  <ChartContainer
                    config={{
                      sessions: {
                        label: 'Sessions',
                        color: 'var(--chart-1)',
                      },
                    }}
                    className="aspect-auto h-[260px] w-full"
                  >
                    <BarChart
                      data={topicChartData}
                      layout="vertical"
                      margin={{ left: 8, right: 8 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="topic"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={110}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Bar dataKey="sessions" radius={6}>
                        {topicChartData.map((item, index) => (
                          <Cell
                            key={item.topic}
                            fill={
                              index === 0
                                ? 'var(--chart-1)'
                                : index === 1
                                  ? 'var(--chart-2)'
                                  : index === 2
                                    ? 'var(--chart-3)'
                                    : index === 3
                                      ? 'var(--chart-4)'
                                      : 'var(--chart-5)'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <EmptyText text="No classified topics yet. Add topic rules or enable fallback review." />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Review queue controls</CardTitle>
              <CardDescription>
                Run fallback classification manually, finalize stale sessions,
                or clean expired review items. Automatic processing can call the
                same logic later via internal cron-ready routes. Queue counts
                only include unmatched conversations captured while fallback
                review was enabled and still within the 48h retention window.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!analyticsState.llm_fallback_enabled ? (
                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  LLM fallback classification is disabled for this chatbot, so
                  unmatched sessions can still appear in analytics without being
                  added to the review queue.
                </div>
              ) : null}
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                  title="Pending unmatched"
                  description="Conversations waiting for fallback classification."
                  value={String(queueHealth.pending)}
                  compact
                />
                <MetricCard
                  title="Failed reviews"
                  description="Queued items that the shared review agent could not classify successfully."
                  value={String(queueHealth.failed)}
                  compact
                />
                <MetricCard
                  title="Classified in 24h"
                  description="Items processed successfully in the last day."
                  value={String(queueHealth.classified_last_24h)}
                  compact
                />
                <MetricCard
                  title="Expiring soon"
                  description="Pending items that will be purged soon if not reviewed."
                  value={String(queueHealth.expiring_soon)}
                  compact
                />
                <MetricCard
                  title="Historical eligible"
                  description="Older unmatched sessions with 2+ user turns that have no queue row attached."
                  value={String(queueHealth.historical_eligible_unmatched)}
                  compact
                />
                <MetricCard
                  title="Awaiting 2nd message"
                  description="Unmatched sessions that are not queue-eligible yet because they only have one user turn."
                  value={String(queueHealth.awaiting_second_message)}
                  compact
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={runManualProcessing}
                >
                  Process unmatched now
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={finalizeSessions}
                >
                  Finalize sessions now
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={cleanupQueue}
                >
                  Run cleanup now
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>
                Summarized chatbot sessions with classification source, topic
                tags, duration, and token usage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Turns</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Topics</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length ? (
                    sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {new Date(session.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatDuration(session.duration_seconds)}
                        </TableCell>
                        <TableCell>{session.user_message_count}</TableCell>
                        <TableCell>
                          {session.detected_language || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {session.topic_tags.length ? (
                              session.topic_tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Unmatched
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{session.resolution_state}</TableCell>
                        <TableCell>{session.classification_source}</TableCell>
                        <TableCell className="text-right">
                          {session.total_tokens}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No chatbot sessions recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topic-mapping" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Topic mapping settings</CardTitle>
                  <CardDescription>
                    Match the first two user messages against chatbot-specific
                    keyword rules before sending unmatched sessions for fallback
                    review.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={openCreateRuleDialog}
                  disabled={isPending}
                >
                  Add rule
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto]">
                <LabeledInput
                  label="Default language"
                  description="Language used when automatic language detection is uncertain."
                  value={ruleSetState?.default_language || 'en'}
                  onChange={(value) =>
                    setRuleSetState((current) => ({
                      ...(current ??
                        buildDefaultRuleSetDraft(
                          projectId,
                          environmentId,
                          chatbot.id,
                        )),
                      default_language: value,
                    }))
                  }
                />
                <LabeledInput
                  label="Minimum confidence"
                  description="Rule confidence needed before a session is classified without fallback."
                  type="number"
                  value={String(ruleSetState?.minimum_confidence ?? 60)}
                  onChange={(value) =>
                    setRuleSetState((current) => ({
                      ...(current ??
                        buildDefaultRuleSetDraft(
                          projectId,
                          environmentId,
                          chatbot.id,
                        )),
                      minimum_confidence: Number(value || 0),
                    }))
                  }
                />
                <label className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm md:mt-6">
                  <span>Enable topic rules</span>
                  <Switch
                    checked={ruleSetState?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      setRuleSetState((current) => ({
                        ...(current ??
                          buildDefaultRuleSetDraft(
                            projectId,
                            environmentId,
                            chatbot.id,
                          )),
                        enabled: checked,
                      }))
                    }
                  />
                </label>
                <div className="md:mt-6">
                  <Button size="sm" disabled={isPending} onClick={saveRuleSet}>
                    Save mapping settings
                  </Button>
                </div>
              </div>

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Topic key</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Negative keywords</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topicRules.length ? (
                    topicRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {rule.label}
                        </TableCell>
                        <TableCell>{rule.topic_key}</TableCell>
                        <TableCell>{rule.language}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {Array.isArray(rule.keywords)
                            ? rule.keywords.join(', ')
                            : ''}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {Array.isArray(rule.negative_keywords) &&
                          rule.negative_keywords.length
                            ? rule.negative_keywords.join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge
                            variant={rule.enabled ? 'default' : 'secondary'}
                          >
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => openEditRuleDialog(rule)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isPending}
                              onClick={() => removeRule(rule.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No topic rules yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review-agent" className="flex flex-col gap-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Analytics settings</CardTitle>
                <CardDescription>
                  Control whether unmatched chatbot conversations are sent to
                  the review agent, and how confident that agent must be before
                  its classification is trusted automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm">
                  <span>Enable LLM fallback classification</span>
                  <Switch
                    checked={analyticsState.llm_fallback_enabled}
                    onCheckedChange={(checked) =>
                      setAnalyticsState((current) => ({
                        ...current,
                        llm_fallback_enabled: checked,
                      }))
                    }
                  />
                </label>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Minimum review confidence
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={analyticsState.review_min_confidence}
                    onChange={(event) =>
                      setAnalyticsState((current) => ({
                        ...current,
                        review_min_confidence: Number(event.target.value || 0),
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Fallback classifications below this confidence stay
                    reviewable instead of being trusted automatically.
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={saveAnalyticsConfig}
                >
                  Save analytics settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shared review agent</CardTitle>
                <CardDescription>
                  Configure the shared Foundry agent that reviews unmatched
                  chatbot conversations, reads the first two user messages plus
                  a short assistant excerpt, and assigns structured analytics
                  tags such as topics, intent, sentiment, and resolution.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <label className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm">
                  <span>Enable shared review agent</span>
                  <Switch
                    checked={reviewAgentState.enabled}
                    onCheckedChange={(checked) =>
                      setReviewAgentState((current) => ({
                        ...current,
                        enabled: checked,
                      }))
                    }
                  />
                </label>
                <LabeledInput
                  label="Project endpoint"
                  description="Azure AI Foundry project endpoint used by the shared review agent that classifies unmatched conversations."
                  value={
                    reviewAgentState.provider_config.project_endpoint || ''
                  }
                  onChange={(value) =>
                    setReviewAgentState((current) => ({
                      ...current,
                      provider_config: {
                        ...current.provider_config,
                        project_endpoint: value,
                      },
                    }))
                  }
                />
                <LabeledInput
                  label="Agent ID"
                  description="The specific Foundry agent that performs the analytics review and returns structured classification tags."
                  value={reviewAgentState.provider_config.agent_id || ''}
                  onChange={(value) =>
                    setReviewAgentState((current) => ({
                      ...current,
                      provider_config: {
                        ...current.provider_config,
                        agent_id: value,
                      },
                    }))
                  }
                />
                <LabeledInput
                  label="Max batch size"
                  description="Maximum number of unmatched conversations the review agent will classify in one automatic or manual run."
                  type="number"
                  value={String(reviewAgentState.max_batch_size)}
                  onChange={(value) =>
                    setReviewAgentState((current) => ({
                      ...current,
                      max_batch_size: Number(value || 1),
                    }))
                  }
                />
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={saveReviewAgentConfig}
                >
                  Save review agent settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isRuleDialogOpen}
        onOpenChange={(open) =>
          !open ? closeRuleDialog() : setIsRuleDialogOpen(true)
        }
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {ruleDraft.id ? 'Edit topic rule' : 'Add topic rule'}
            </DialogTitle>
            <DialogDescription>
              Define the topic metadata and keyword matching behavior used for
              early conversation classification.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              addRule();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <LabeledInput
                label="Topic key"
                description="Canonical topic identifier used in analytics."
                value={ruleDraft.topic_key}
                onChange={(value) =>
                  setRuleDraft((current) => ({ ...current, topic_key: value }))
                }
              />
              <LabeledInput
                label="Label"
                description="Friendly label shown in analytics tables and charts."
                value={ruleDraft.label}
                onChange={(value) =>
                  setRuleDraft((current) => ({ ...current, label: value }))
                }
              />
              <LabeledInput
                label="Language"
                description="Use an ISO-style language code like en, de, or all."
                value={ruleDraft.language}
                onChange={(value) =>
                  setRuleDraft((current) => ({ ...current, language: value }))
                }
              />
              <LabeledInput
                label="Keywords"
                description="Comma-separated phrases that should match this topic."
                value={ruleDraft.keywords}
                onChange={(value) =>
                  setRuleDraft((current) => ({ ...current, keywords: value }))
                }
              />
              <LabeledInput
                label="Negative keywords"
                description="Optional comma-separated blockers for false positives."
                value={ruleDraft.negative_keywords}
                onChange={(value) =>
                  setRuleDraft((current) => ({
                    ...current,
                    negative_keywords: value,
                  }))
                }
              />
              <LabeledInput
                label="Priority"
                description="Lower numbers win when multiple topic rules match."
                type="number"
                value={String(ruleDraft.priority)}
                onChange={(value) =>
                  setRuleDraft((current) => ({
                    ...current,
                    priority: Number(value || 100),
                  }))
                }
              />
            </div>

            <label className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm">
              <span>Enable rule</span>
              <Switch
                checked={ruleDraft.enabled}
                onCheckedChange={(checked) =>
                  setRuleDraft((current) => ({ ...current, enabled: checked }))
                }
              />
            </label>

            <DialogFooter>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={closeRuleDialog}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={isPending}>
                {ruleDraft.id ? 'Save rule' : 'Add rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  title,
  description,
  value,
  compact = false,
}: {
  title: string;
  description: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={
            compact ? 'text-2xl font-semibold' : 'text-3xl font-semibold'
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function LabeledInput({
  label,
  description,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
