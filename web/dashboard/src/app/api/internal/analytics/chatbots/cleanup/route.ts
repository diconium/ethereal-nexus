import { NextRequest, NextResponse } from 'next/server';
import { cleanupChatbotAnalyticsJob } from '@/data/ai/analytics-jobs';
import { ensureInternalServiceAccess } from '@/app/api/internal/utils';

export async function POST(request: NextRequest) {
  const authError = ensureInternalServiceAccess(request);
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => ({}))) as {
    pruneExpiredQueue?: boolean;
  };

  const result = await cleanupChatbotAnalyticsJob({
    pruneExpiredQueue: body.pruneExpiredQueue,
  });

  return NextResponse.json(result);
}
