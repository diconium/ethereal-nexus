import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import { projectAiAuthorDialogs } from '@/data/ai/schema';
import {
  sampleAuthorDialogDefinition,
  sampleAuthorValues,
} from '@/data/ai/sample-author-data';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;

  const body = (await request.json().catch(() => null)) as {
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    conversationId?: string;
    context?: {
      dialogDefinition?: unknown;
      values?: unknown;
    };
  } | null;

  if (!body?.messages?.length) {
    return NextResponse.json(
      { error: 'messages are required.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const rows = await db
    .select()
    .from(projectAiAuthorDialogs)
    .where(
      and(
        eq(projectAiAuthorDialogs.public_slug, publicSlug),
        eq(projectAiAuthorDialogs.enabled, true),
      ),
    )
    .limit(1);

  const authorDialog = rows[0];
  if (!authorDialog) {
    return NextResponse.json(
      { error: 'Author dialog not found.' },
      { status: HttpStatus.NOT_FOUND },
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
    `Workspace system prompt: ${authorDialog.system_prompt}`,
    `Dialog definition: ${JSON.stringify(
      body.context?.dialogDefinition ?? sampleAuthorDialogDefinition,
    )}`,
    `Current values: ${JSON.stringify(
      body.context?.values ?? sampleAuthorValues,
    )}`,
  ].join('\n\n');

  try {
    switch (authorDialog.provider) {
      case 'microsoft-foundry': {
        const firstTurnContent = `${contextPreamble}\n\n${latestUserMessage.content}`;
        const response = await callFoundryChat({
          providerConfig: authorDialog.provider_config,
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
            route: 'author-chat-public',
            publicSlug,
            authorDialogId: authorDialog.id,
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
            error: `Unsupported author dialog provider: ${authorDialog.provider}`,
          },
          { status: HttpStatus.BAD_REQUEST },
        );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to reach the author agent runtime.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
