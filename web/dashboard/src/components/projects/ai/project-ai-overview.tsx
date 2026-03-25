import {
  Activity,
  BarChart3,
  Bot,
  Clock3,
  MessageSquareText,
  Radar,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  };
};

const SYSTEM_ACTIVITY_POINTS = [42, 58, 51, 73, 65, 89, 82];

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
          title="Messages Processed"
          value="48.2K"
          hint="Last 7 days"
          icon={MessageSquareText}
        />
        <OverviewStat
          title="Avg Response Time"
          value="1.2s"
          hint="Azure Foundry runtime"
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
                  <p className="text-sm font-medium text-foreground">
                    System activity
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chatbot traffic, schedule runs, and overall AI system load.
                  </p>
                </div>
                <Badge variant="outline">7 days</Badge>
              </div>

              <div className="flex h-48 items-end gap-3 rounded-xl bg-gradient-to-b from-muted/10 to-muted/40 p-4">
                {SYSTEM_ACTIVITY_POINTS.map((value, index) => (
                  <div
                    key={`${value}-${index}`}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-primary/85 via-primary/70 to-primary/30"
                      style={{ height: `${value}%` }}
                    />
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      D{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border bg-card px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="size-4 text-primary" /> Agent Insights
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border bg-muted/15 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Top Performing Agent
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {stats.topPerformingAgent}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Highest issue detection rate
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
              title="Public API Usage"
              value="9.4K"
              hint="Requests (rate-limited)"
              icon={BarChart3}
            />
          </div>

          <div className="grid gap-4">
            <InsightCard
              title="Chatbot Health"
              value="98.7%"
              hint="Success rate across all chatbot interactions."
              icon={ShieldCheck}
            />
            <InsightCard
              title="Content Advisor Impact"
              value="+22%"
              hint="Improvement in SEO score after fixes."
              icon={Activity}
            />
            <InsightCard
              title="API Reliability"
              value="1.3K"
              hint="Excess requests prevented by rate limiting."
              icon={ShieldCheck}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
