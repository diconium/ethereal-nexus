import { notFound } from 'next/navigation';
import {
  getProjectById,
  getEnvironmentsByProject,
} from '@/data/projects/actions';
import {
  getChatbotApiSettingsByEnvironment,
  getChatbotsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { DEFAULT_CHATBOT_API_SETTINGS_VALUES } from '@/data/ai/chatbot-api-settings';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';
import { ChatbotDemo } from '@/components/projects/demos/chatbot-demo';

type PageProps = {
  params: Promise<{ id: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatbotDemoPage({
  params,
  searchParams,
}: PageProps) {
  const { id, slug } = await params;
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
        title="Unable to load chatbot demo"
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
        title="Unable to load chatbot demo"
        message="Select an environment before opening a demo page."
      />
    );
  }

  const [flagsResult, chatbotsResult, apiSettingsResult] = await Promise.all([
    getProjectAiFlags(id, selectedEnvironment.id),
    getChatbotsByEnvironment(id, selectedEnvironment.id),
    getChatbotApiSettingsByEnvironment(id, selectedEnvironment.id),
  ]);

  if (
    !flagsResult.success ||
    !chatbotsResult.success ||
    !apiSettingsResult.success
  ) {
    return (
      <AiErrorNotice
        title="Unable to load chatbot demo"
        message={
          !flagsResult.success
            ? flagsResult.error.message
            : !chatbotsResult.success
              ? chatbotsResult.error.message
              : !apiSettingsResult.success
                ? apiSettingsResult.error.message
                : 'Failed to load chatbot demo.'
        }
      />
    );
  }

  const demosFlag = flagsResult.data.find((flag) => flag.key === 'demos');
  if (!demosFlag?.enabled) {
    return (
      <FeatureDisabledNotice
        projectId={id}
        title="Demos"
        environmentId={selectedEnvironment.id}
      />
    );
  }

  const chatbot = chatbotsResult.data.find((item) => item.slug === slug);
  if (!chatbot) {
    notFound();
  }

  const apiSettings = apiSettingsResult.data.find(
    (item) => item.chatbot_id === chatbot.id,
  ) ?? {
    id: crypto.randomUUID(),
    project_id: id,
    environment_id: selectedEnvironment.id,
    chatbot_id: chatbot.id,
    ...DEFAULT_CHATBOT_API_SETTINGS_VALUES,
    created_at: new Date(),
    updated_at: new Date(),
  };

  return <ChatbotDemo chatbot={chatbot} apiSettings={apiSettings} />;
}
