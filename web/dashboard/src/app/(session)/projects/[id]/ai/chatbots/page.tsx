import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getChatbotsByEnvironment,
  getChatbotApiSettingsByEnvironment,
  getChatbotStatsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { ChatbotsManager } from '@/components/projects/ai/chatbots-manager';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiChatbotsPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
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
    const message = environments.error.message;

    return (
      <AiErrorNotice title="Unable to load AI chatbots" message={message} />
    );
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data[0];
  const flagsResult = selectedEnvironment
    ? await getProjectAiFlags(id, selectedEnvironment.id)
    : null;
  if (selectedEnvironment && (!flagsResult || !flagsResult.success)) {
    return (
      <AiErrorNotice
        title="Unable to load AI chatbots"
        message={
          flagsResult?.success
            ? 'Failed to load AI chatbots.'
            : (flagsResult?.error.message ?? 'Failed to load AI chatbots.')
        }
      />
    );
  }
  const flags = flagsResult?.success ? flagsResult.data : [];
  const chatbotFlag = flags.find((flag) => flag.key === 'chatbots');

  const [chatbots, chatbotStats, chatbotApiSettings] = selectedEnvironment
    ? await Promise.all([
        getChatbotsByEnvironment(id, selectedEnvironment.id),
        getChatbotStatsByEnvironment(id, selectedEnvironment.id),
        getChatbotApiSettingsByEnvironment(id, selectedEnvironment.id),
      ])
    : [null, null, null];

  return (
    <div className="space-y-6">
      {!chatbotFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Chat bots"
          environmentId={selectedEnvironment?.id}
        />
      ) : !selectedEnvironment ? (
        <FeatureDisabledNotice projectId={id} title="Chat bots" />
      ) : chatbots?.success &&
        chatbotStats?.success &&
        chatbotApiSettings?.success ? (
        <ChatbotsManager
          projectId={id}
          environmentId={selectedEnvironment.id}
          chatbots={chatbots.data}
          stats={chatbotStats.data}
          apiSettings={chatbotApiSettings.data}
        />
      ) : (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Unable to load chatbots for this environment.
        </div>
      )}
    </div>
  );
}
