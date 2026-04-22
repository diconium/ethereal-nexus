import { notFound } from 'next/navigation';
import { ChatbotAnalyticsDashboard } from '@/components/projects/ai/chatbot-analytics-dashboard';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';
import {
  getAnalyticsReviewAgentConfigByEnvironment,
  getChatbotAnalyticsConfigByChatbot,
  getChatbotAnalyticsDashboard,
  getChatbotTopicRuleSetWithRules,
} from '@/data/ai/analytics-actions';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';

type PageProps = {
  params: Promise<{ id: string; chatbotId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatbotAnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  const { id, chatbotId } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const [project, environments] = await Promise.all([
    getProjectById(id),
    getEnvironmentsByProject(id),
  ]);

  if (!project.success) {
    notFound();
  }

  if (!environments.success) {
    return (
      <AiErrorNotice
        title="Unable to load chatbot analytics"
        message={environments.error.message}
      />
    );
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data[0];

  if (!selectedEnvironment) {
    return (
      <AiErrorNotice
        title="Unable to load chatbot analytics"
        message="Select an environment before opening chatbot analytics."
      />
    );
  }

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date();

  const [dashboard, analyticsConfig, reviewAgentConfig, topicRuleSet] =
    await Promise.all([
      getChatbotAnalyticsDashboard(id, chatbotId, from, to),
      getChatbotAnalyticsConfigByChatbot(id, chatbotId),
      getAnalyticsReviewAgentConfigByEnvironment(id, selectedEnvironment.id),
      getChatbotTopicRuleSetWithRules(id, chatbotId),
    ]);

  if (
    !dashboard.success ||
    !analyticsConfig.success ||
    !reviewAgentConfig.success ||
    !topicRuleSet.success
  ) {
    return (
      <AiErrorNotice
        title="Unable to load chatbot analytics"
        message={
          !dashboard.success
            ? dashboard.error.message
            : !analyticsConfig.success
              ? analyticsConfig.error.message
              : !reviewAgentConfig.success
                ? reviewAgentConfig.error.message
                : !topicRuleSet.success
                  ? topicRuleSet.error.message
                  : 'Failed to load chatbot analytics.'
        }
      />
    );
  }

  return (
    <ChatbotAnalyticsDashboard
      projectId={id}
      environmentId={selectedEnvironment.id}
      chatbot={dashboard.data.chatbot}
      overview={dashboard.data.overview}
      timeseries={dashboard.data.timeseries}
      breakdown={dashboard.data.breakdown}
      sessions={dashboard.data.sessions}
      queueHealth={dashboard.data.queueHealth}
      analyticsConfig={analyticsConfig.data}
      reviewAgentConfig={reviewAgentConfig.data}
      topicRuleSet={topicRuleSet.data.ruleSet}
      topicRules={topicRuleSet.data.rules}
    />
  );
}
