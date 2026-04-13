import { NextRequest, NextResponse } from 'next/server';
import { processChatbotUnmatchedReviewJob } from '@/data/ai/analytics-jobs';
import { ensureInternalServiceAccess } from '@/app/api/internal/utils';

export async function POST(request: NextRequest) {
  const authError = ensureInternalServiceAccess(request);
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    environmentId?: string;
    chatbotId?: string;
    limit?: number;
  };

  if (!body.projectId || !body.environmentId) {
    return NextResponse.json(
      { error: 'projectId and environmentId are required.' },
      { status: 400 },
    );
  }

  const result = await processChatbotUnmatchedReviewJob({
    projectId: body.projectId,
    environmentId: body.environmentId,
    chatbotId: body.chatbotId,
    limit: body.limit,
  });

  return NextResponse.json(result);
}
