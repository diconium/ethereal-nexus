'use client';

import {
  Activity,
  AreaChart as AreaChartIcon,
  Bot,
  Clock3,
  AlertTriangle,
  Radar,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ProjectAiFeatureFlag } from '@/data/ai/dto';

type ProjectAiOverviewProps = {
  projectId: string;
  environmentId?: string;
  flags: ProjectAiFeatureFlag[];
  stats: {
    activeFeatures: number;
    totalChatbots: number;
    contentIssuesFound: number;
    scheduledRuns: number;
    topPerformingAgent: string;
    contentAdvisorResolvedRate: number;
    persistentIssues: number;
    openIssues: number;
    enabledAgents: number;
    systemActivityPoints: Array<{ day: string; detections: number }>;
  };
};

const systemActivityChartConfig = {
  detections: {
    label: 'Detections',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

function OverviewStat({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4 text-primary" />
          <span>{title}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function ProjectAiOverview({
  projectId,
  environmentId,
  flags,
  stats,
}: ProjectAiOverviewProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          AI Overview
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A concise snapshot of enabled AI capabilities, chatbot coverage, and
          operational health for the selected environment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewStat
          title="Active AI Features"
          value={String(stats.activeFeatures)}
          hint="Enabled across this environment"
          icon={Sparkles}
        />
        <OverviewStat
          title="Total Chatbots"
          value={String(stats.totalChatbots)}
          hint="Across all environments"
          icon={Bot}
        />
        <OverviewStat
          title="Open Issues"
          value={String(stats.openIssues)}
          hint="Currently need review or follow-up"
          icon={AlertTriangle}
        />
        <OverviewStat
          title="Enabled Agents"
          value={String(stats.enabledAgents)}
          hint="Configured and active in this environment"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">System Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border bg-muted/15 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AreaChartIcon className="size-4 text-primary" />
                    Detection activity
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Content Advisor detections recorded across the last 7 days.
                  </p>
                </div>
                <Badge variant="outline">7 days</Badge>
              </div>

              <ChartContainer
                config={systemActivityChartConfig}
                className="aspect-auto h-48 w-full"
              >
                <AreaChart
                  data={stats.systemActivityPoints}
                  margin={{ left: 8, right: 8 }}
                >
                  <defs>
                    <linearGradient
                        id="fillSystemLoad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-detections)"
                        stopOpacity={0.75}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-detections)"
                        stopOpacity={0.08}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="detections"
                    type="natural"
                    fill="url(#fillSystemLoad)"
                    stroke="var(--color-detections)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="space-y-3 rounded-2xl border bg-card px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="size-4 text-primary" /> Agent Insights
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border bg-muted/15 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Most active agent
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {stats.topPerformingAgent}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Highest number of recorded issue detections
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <InsightCard
              title="Content Issues Found"
              value={String(stats.contentIssuesFound)}
              hint="Across monitored pages"
              icon={ScanSearch}
            />
            <InsightCard
              title="Scheduled Runs"
              value={String(stats.scheduledRuns)}
              hint="Active Content Advisor schedules"
              icon={Radar}
            />
            <InsightCard
              title="Persistent Issues"
              value={String(stats.persistentIssues)}
              hint="Tracked across all Content Advisor runs"
              icon={Activity}
            />
          </div>

          <div className="grid gap-4">
            <InsightCard
              title="Content Advisor Impact"
              value={`${stats.contentAdvisorResolvedRate}%`}
              hint="Share of persistent issues marked done or won't do."
              icon={Activity}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
