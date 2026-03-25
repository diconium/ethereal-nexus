import { notFound } from 'next/navigation';
import {
  getProjectById,
  getEnvironmentsByProject,
} from '@/data/projects/actions';
import { getChatbotsByEnvironment, getProjectAiFlags } from '@/data/ai/actions';
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

  const [flagsResult, chatbotsResult] = await Promise.all([
    getProjectAiFlags(id, selectedEnvironment.id),
    getChatbotsByEnvironment(id, selectedEnvironment.id),
  ]);

  if (!flagsResult.success || !chatbotsResult.success) {
    return (
      <AiErrorNotice
        title="Unable to load chatbot demo"
        message={
          !flagsResult.success
            ? flagsResult.error.message
            : !chatbotsResult.success
              ? chatbotsResult.error.message
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

  return <ChatbotDemo chatbot={chatbot} />;
}
