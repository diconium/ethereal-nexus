import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { HttpStatus } from '@/app/api/utils';
import { getAuthorDialogById } from '@/data/ai/actions';
import {
  sampleAuthorDialogDefinition,
  sampleAuthorValues,
} from '@/data/ai/sample-author-data';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
    environmentId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId, environmentId } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: HttpStatus.FORBIDDEN },
    );
  }

  const permission =
    session.user.role === 'admin'
      ? 'manage'
      : session.permissions?.[projectId] || 'none';
  if (
    !['write', 'manage'].includes(permission) &&
    session.user.role !== 'admin'
  ) {
    return NextResponse.json(
      { error: 'You do not have permissions for this resource.' },
      { status: HttpStatus.FORBIDDEN },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    authorDialogId?: string;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    conversationId?: string;
    context?: {
      dialogDefinition?: unknown;
      values?: unknown;
    };
  } | null;

  if (!body?.authorDialogId || !body.messages?.length) {
    return NextResponse.json(
      { error: 'authorDialogId and messages are required.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const authorDialog = await getAuthorDialogById(
    projectId,
    body.authorDialogId,
  );
  if (!authorDialog.success) {
    return NextResponse.json(
      { error: authorDialog.error.message },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  if (authorDialog.data.environment_id !== environmentId) {
    return NextResponse.json(
      { error: 'Author dialog does not belong to the selected environment.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const latestUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === 'user');
  if (!latestUserMessage) {
    return NextResponse.json(
      { error: 'A user message is required.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const contextPreamble = [
    'You are an authoring assistant for structured dialog editing.',
    'Reply using exactly this format:',
    'MESSAGE:\n<short explanation>',
    'UPDATED_VALUES_JSON:\n<valid json>',
    'Only include UPDATED_VALUES_JSON when a values update is needed.',
    `Workspace system prompt: ${authorDialog.data.system_prompt}`,
    `Dialog definition: ${JSON.stringify(
      body.context?.dialogDefinition ?? sampleAuthorDialogDefinition,
    )}`,
    `Current values: ${JSON.stringify(
      body.context?.values ?? sampleAuthorValues,
    )}`,
  ].join('\n\n');

  try {
    switch (authorDialog.data.provider) {
      case 'microsoft-foundry': {
        const firstTurnContent = `${contextPreamble}\n\n${latestUserMessage.content}`;
        const response = await callFoundryChat({
          providerConfig: authorDialog.data.provider_config,
          messages: [
            {
              role: 'user',
              content: body.conversationId
                ? latestUserMessage.content
                : firstTurnContent,
            },
          ],
          conversationId: body.conversationId,
          loggerContext: {
            route: 'author-chat',
            projectId,
            environmentId,
            authorDialogId: authorDialog.data.id,
          },
        });

        return NextResponse.json({
          reply: response.reply,
          conversationId: response.conversationId,
        });
      }
      default:
        return NextResponse.json(
          {
            error: `Unsupported author dialog provider: ${authorDialog.data.provider}`,
          },
          { status: HttpStatus.BAD_REQUEST },
        );
    }
  } catch (error) {
    logger.error('Failed to reach author agent runtime', error as Error, {
      route: 'author-chat',
      projectId,
      environmentId,
      authorDialogId: authorDialog.data.id,
    });
    return NextResponse.json(
      { error: 'Failed to reach the author agent runtime.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
