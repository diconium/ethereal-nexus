import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { DEFAULT_CHATBOT_API_SETTINGS_VALUES } from '@/data/ai/chatbot-api-settings';
import {
  projectAiChatbotApiSettings,
  projectAiChatbots,
} from '@/data/ai/schema';
import {
  buildIdentityResolution,
  getCounterState,
  getSessionCookieIdentifier,
  getTemporaryBlock,
} from '@/lib/rate-limit';

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;

  const rows = await db
    .select({
      chatbot: projectAiChatbots,
      settings: projectAiChatbotApiSettings,
    })
    .from(projectAiChatbots)
    .leftJoin(
      projectAiChatbotApiSettings,
      eq(projectAiChatbotApiSettings.chatbot_id, projectAiChatbots.id),
    )
    .where(
      and(
        eq(projectAiChatbots.public_slug, publicSlug),
        eq(projectAiChatbots.enabled, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row?.chatbot) {
    return NextResponse.json({ error: 'Chatbot not found.' }, { status: 404 });
  }

  const chatbot = row.chatbot;
  const settings = row.settings ?? {
    id: crypto.randomUUID(),
    project_id: chatbot.project_id,
    environment_id: chatbot.environment_id,
    chatbot_id: chatbot.id,
    ...DEFAULT_CHATBOT_API_SETTINGS_VALUES,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const identityResolution = buildIdentityResolution(request, {
    useIp: settings.rate_limit_use_ip,
    useSessionCookie: settings.rate_limit_use_session_cookie,
    useFingerprint: settings.rate_limit_use_fingerprint,
    fingerprintHeaderName: settings.fingerprint_header_name,
  });
  const sessionIdentityKey = getSessionCookieIdentifier(request);
  const scopeKey = `${publicSlug}`;
  const ipIdentity =
    identityResolution.identities.find(
      (identity) => identity.source === 'ip',
    ) ?? identityResolution.identities[0];

  const requestWindow = settings.rate_limit_enabled
    ? await Promise.all(
        identityResolution.identities.map(async (identity) => {
          const state = await getCounterState(
            `${scopeKey}:${identity.key}:window`,
          );
          return {
            source: identity.source,
            current: state.current,
            remaining: Math.max(
              0,
              settings.rate_limit_max_requests - state.current,
            ),
            resetSeconds: state.resetSeconds,
            limit: settings.rate_limit_max_requests,
            windowSeconds: settings.rate_limit_window_seconds,
          };
        }),
      )
    : [];

  const temporaryBlock = settings.temporary_block_enabled
    ? await Promise.all(
        identityResolution.identities.map(async (identity) => {
          const state = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
          return { source: identity.source, ...state };
        }),
      )
    : [];

  const sessionCap =
    settings.session_request_cap_enabled && sessionIdentityKey
      ? await getCounterState(
          `${scopeKey}:session:${sessionIdentityKey}:session-cap`,
        )
      : null;

  const dailyTokenBudget = settings.ip_daily_token_budget_enabled
    ? await getCounterState(`${scopeKey}:${ipIdentity.key}:daily-tokens`)
    : null;

  return NextResponse.json({
    requestWindow: {
      enabled: settings.rate_limit_enabled,
      identities: requestWindow,
    },
    sessionCap: {
      enabled: settings.session_request_cap_enabled,
      available: Boolean(sessionIdentityKey),
      current: sessionCap?.current ?? 0,
      remaining: sessionCap
        ? Math.max(
            0,
            settings.session_request_cap_max_requests - sessionCap.current,
          )
        : settings.session_request_cap_max_requests,
      resetSeconds: sessionCap?.resetSeconds ?? 0,
      limit: settings.session_request_cap_max_requests,
      windowSeconds: settings.session_request_cap_window_seconds,
    },
    dailyTokenBudget: {
      enabled: settings.ip_daily_token_budget_enabled,
      current: dailyTokenBudget?.current ?? 0,
      remaining: dailyTokenBudget
        ? Math.max(0, settings.ip_daily_token_budget - dailyTokenBudget.current)
        : settings.ip_daily_token_budget,
      resetSeconds: dailyTokenBudget?.resetSeconds ?? 0,
      limit: settings.ip_daily_token_budget,
    },
    temporaryBlock: {
      enabled: settings.temporary_block_enabled,
      identities: temporaryBlock,
    },
  });
}
