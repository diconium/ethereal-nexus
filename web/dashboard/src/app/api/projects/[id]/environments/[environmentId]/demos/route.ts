import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { HttpStatus } from '@/app/api/utils';
import {
  getCataloguesByEnvironment,
  getChatbotsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{
    id: string;
    environmentId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id, environmentId } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    logger.warn('Unauthorized request to get demos', { url: request.url });
    return NextResponse.json(
      {
        aiEnabled: false,
        enabled: false,
        enabledAiFeatures: [],
        chatbots: [],
        catalogues: [],
        error: 'You do not have permissions for this resource.',
      },
      { status: HttpStatus.FORBIDDEN },
    );
  }

  const [flags, chatbots, catalogues] = await Promise.all([
    getProjectAiFlags(id, environmentId),
    getChatbotsByEnvironment(id, environmentId),
    getCataloguesByEnvironment(id, environmentId),
  ]);

  if (!flags.success) {
    const status = flags.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      {
        aiEnabled: false,
        enabled: false,
        enabledAiFeatures: [],
        chatbots: [],
        catalogues: [],
        error: flags.error.message,
      },
      { status },
    );
  }

  if (!chatbots.success) {
    const status = chatbots.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      {
        aiEnabled: false,
        enabled: false,
        enabledAiFeatures: [],
        chatbots: [],
        catalogues: [],
        error: chatbots.error.message,
      },
      { status },
    );
  }

  if (!catalogues.success) {
    const status = catalogues.error.message.includes('No user') ? 401 : 500;
    return NextResponse.json(
      {
        aiEnabled: false,
        enabled: false,
        enabledAiFeatures: [],
        chatbots: [],
        catalogues: [],
        error: catalogues.error.message,
      },
      { status },
    );
  }

  const demosFlag = flags.data.find((flag) => flag.key === 'demos');
  const enabledAiFeatures = flags.data
    .filter((flag) => flag.enabled)
    .map((flag) => flag.key);
  const aiEnabled = flags.data.some(
    (flag) => flag.key !== 'demos' && flag.enabled,
  );

  return NextResponse.json({
    aiEnabled,
    enabled: demosFlag?.enabled ?? false,
    enabledAiFeatures,
    chatbots: chatbots.data.filter((chatbot) => chatbot.enabled),
    catalogues: catalogues.data.filter(
      (catalogue) => catalogue.show_in_sidebar,
    ),
  });
}
