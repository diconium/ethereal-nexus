import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { HttpStatus } from '@/app/api/utils';
import { ensureInternalServiceAccess } from '@/app/api/internal/utils';
import { db } from '@/db';
import { projectAiChatbots } from '@/data/ai/schema';
import { logger } from '@/lib/logger';
import {listVertexSessions} from "@/lib/ai-providers/google-vertex";

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = ensureInternalServiceAccess(request);
  if (authError) {
    return authError;
  }

  const { publicSlug } = await context.params;

  const rows = await db
    .select()
    .from(projectAiChatbots)
    .where(eq(projectAiChatbots.public_slug, publicSlug))
    .limit(1);

  const chatbot = rows[0];
  if (!chatbot) {
    return NextResponse.json(
      { error: 'Chatbot not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  if (chatbot.provider !== 'vertex-ai-google') {
    return NextResponse.json(
      { error: 'Chatbot is not configured to use Vertex AI.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  try {
    const sessions = await listVertexSessions({
      providerConfig: chatbot.provider_config,
      loggerContext: {
        route: 'internal-vertex-sessions',
        publicSlug,
        chatbotId: chatbot.id,
      },
    });

    return NextResponse.json({
      chatbot: {
        id: chatbot.id,
        name: chatbot.name,
        publicSlug: chatbot.public_slug,
      },
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    logger.error('Failed to list Vertex AI chatbot sessions', error as Error, {
      route: 'internal-vertex-sessions',
      publicSlug,
      chatbotId: chatbot.id,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to list Vertex AI sessions.',
      },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
