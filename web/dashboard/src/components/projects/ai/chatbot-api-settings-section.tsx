'use client';

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { upsertChatbotApiSettings } from '@/data/ai/actions';
import { DEFAULT_CHATBOT_API_SETTINGS_VALUES } from '@/data/ai/chatbot-api-settings';
import type {
  Chatbot,
  ChatbotApiSettings,
  ChatbotApiSettingsInput,
} from '@/data/ai/dto';

type Props = {
  projectId: string;
  environmentId: string;
  initialSettings: ChatbotApiSettings[];
  chatbots: Array<Pick<Chatbot, 'id' | 'name' | 'public_slug'>>;
  showChatbotSelector?: boolean;
  showSaveButton?: boolean;
  controlledSettings?: SettingsDraft | null;
  onControlledSettingsChange?: (next: SettingsDraft) => void;
};

type SettingsDraft = Omit<
  ChatbotApiSettingsInput,
  'project_id' | 'environment_id'
> & {
  id?: string;
};

const DEV_TEST_PRESETS = {
  burst429: {
    label: 'Burst 429',
    description:
      'Hit the endpoint three times quickly and expect the third call to return 429.',
    overrides: {
      rate_limit_enabled: true,
      rate_limit_max_requests: 2,
      rate_limit_window_seconds: 10,
      rate_limit_use_ip: true,
      rate_limit_use_session_cookie: true,
      rate_limit_use_fingerprint: false,
      message_size_limit_enabled: true,
      max_message_characters: 8000,
      max_request_body_bytes: 16000,
      session_request_cap_enabled: false,
      ip_daily_token_budget_enabled: false,
      temporary_block_enabled: false,
    },
  },
  payload413: {
    label: 'Payload 413',
    description:
      'Send an oversized body and expect the API to reject it before the model runs.',
    overrides: {
      message_size_limit_enabled: true,
      max_message_characters: 40,
      max_request_body_bytes: 180,
      rate_limit_enabled: false,
      session_request_cap_enabled: false,
      ip_daily_token_budget_enabled: false,
      temporary_block_enabled: false,
    },
  },
  sessionCap: {
    label: 'Session cap',
    description:
      'Reuse the same browser session and expect the third request to return 429.',
    overrides: {
      rate_limit_enabled: false,
      session_request_cap_enabled: true,
      session_request_cap_max_requests: 2,
      session_request_cap_window_seconds: 60,
      rate_limit_use_ip: false,
      rate_limit_use_session_cookie: true,
      rate_limit_use_fingerprint: false,
      ip_daily_token_budget_enabled: false,
      temporary_block_enabled: false,
      message_size_limit_enabled: true,
      max_message_characters: 8000,
      max_request_body_bytes: 16000,
    },
  },
  tokenBudget: {
    label: 'Token budget',
    description:
      'Ask for a long answer twice and expect the IP budget to run out quickly.',
    overrides: {
      rate_limit_enabled: false,
      session_request_cap_enabled: false,
      ip_daily_token_budget_enabled: true,
      ip_daily_token_budget: 80,
      temporary_block_enabled: false,
      message_size_limit_enabled: true,
      max_message_characters: 8000,
      max_request_body_bytes: 16000,
      rate_limit_use_ip: true,
      rate_limit_use_session_cookie: false,
      rate_limit_use_fingerprint: false,
    },
  },
  tempBlock: {
    label: 'Temporary block',
    description:
      'Trigger repeated violations and expect a cooldown block on the next request.',
    overrides: {
      rate_limit_enabled: true,
      rate_limit_max_requests: 1,
      rate_limit_window_seconds: 30,
      temporary_block_enabled: true,
      temporary_block_violation_threshold: 2,
      temporary_block_window_seconds: 60,
      temporary_block_duration_seconds: 30,
      session_request_cap_enabled: false,
      ip_daily_token_budget_enabled: false,
      rate_limit_use_ip: true,
      rate_limit_use_session_cookie: false,
      rate_limit_use_fingerprint: false,
      message_size_limit_enabled: true,
      max_message_characters: 8000,
      max_request_body_bytes: 16000,
    },
  },
} as const;

function NumericField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || min))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function SettingsAccordionSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="min-w-0 rounded-xl border"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between rounded-xl px-4 py-4 text-left"
        >
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <ChevronDown
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function buildDefaultSettings(chatbotId: string): SettingsDraft {
  return {
    chatbot_id: chatbotId,
    ...DEFAULT_CHATBOT_API_SETTINGS_VALUES,
  };
}

export function ChatbotApiSettingsSection({
  projectId,
  environmentId,
  initialSettings,
  chatbots,
  showChatbotSelector = true,
  showSaveButton = true,
  controlledSettings,
  onControlledSettingsChange,
}: Props) {
  const [selectedChatbotId, setSelectedChatbotId] = useState(
    chatbots[0]?.id ?? '',
  );
  const [settingsByChatbot, setSettingsByChatbot] = useState<
    Record<string, SettingsDraft>
  >(() =>
    Object.fromEntries(
      initialSettings.map((item) => [
        item.chatbot_id,
        {
          id: item.id,
          chatbot_id: item.chatbot_id,
          rate_limit_enabled: item.rate_limit_enabled,
          rate_limit_max_requests: item.rate_limit_max_requests,
          rate_limit_window_seconds: item.rate_limit_window_seconds,
          rate_limit_use_ip: item.rate_limit_use_ip,
          rate_limit_use_session_cookie: item.rate_limit_use_session_cookie,
          rate_limit_use_fingerprint: item.rate_limit_use_fingerprint,
          fingerprint_header_name: item.fingerprint_header_name,
          message_size_limit_enabled: item.message_size_limit_enabled,
          max_message_characters: item.max_message_characters,
          max_request_body_bytes: item.max_request_body_bytes,
          session_request_cap_enabled: item.session_request_cap_enabled,
          session_request_cap_max_requests:
            item.session_request_cap_max_requests,
          session_request_cap_window_seconds:
            item.session_request_cap_window_seconds,
          ip_daily_token_budget_enabled: item.ip_daily_token_budget_enabled,
          ip_daily_token_budget: item.ip_daily_token_budget,
          temporary_block_enabled: item.temporary_block_enabled,
          temporary_block_violation_threshold:
            item.temporary_block_violation_threshold,
          temporary_block_window_seconds: item.temporary_block_window_seconds,
          temporary_block_duration_seconds:
            item.temporary_block_duration_seconds,
        },
      ]),
    ),
  );
  const [origin, setOrigin] = useState('');
  const [isPending, startTransition] = useTransition();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isEmbedded = !showChatbotSelector;
  const isControlled =
    controlledSettings !== undefined && !!onControlledSettingsChange;

  const activeChatbot =
    chatbots.find((chatbot) => chatbot.id === selectedChatbotId) ?? null;
  const settings =
    (controlledSettings ??
      (activeChatbot && settingsByChatbot[activeChatbot.id])) ||
    (activeChatbot ? buildDefaultSettings(activeChatbot.id) : null);

  useEffect(() => {
    const next = Object.fromEntries(
      initialSettings.map((item) => [
        item.chatbot_id,
        {
          id: item.id,
          chatbot_id: item.chatbot_id,
          rate_limit_enabled: item.rate_limit_enabled,
          rate_limit_max_requests: item.rate_limit_max_requests,
          rate_limit_window_seconds: item.rate_limit_window_seconds,
          rate_limit_use_ip: item.rate_limit_use_ip,
          rate_limit_use_session_cookie: item.rate_limit_use_session_cookie,
          rate_limit_use_fingerprint: item.rate_limit_use_fingerprint,
          fingerprint_header_name: item.fingerprint_header_name,
          message_size_limit_enabled: item.message_size_limit_enabled,
          max_message_characters: item.max_message_characters,
          max_request_body_bytes: item.max_request_body_bytes,
          session_request_cap_enabled: item.session_request_cap_enabled,
          session_request_cap_max_requests:
            item.session_request_cap_max_requests,
          session_request_cap_window_seconds:
            item.session_request_cap_window_seconds,
          ip_daily_token_budget_enabled: item.ip_daily_token_budget_enabled,
          ip_daily_token_budget: item.ip_daily_token_budget,
          temporary_block_enabled: item.temporary_block_enabled,
          temporary_block_violation_threshold:
            item.temporary_block_violation_threshold,
          temporary_block_window_seconds: item.temporary_block_window_seconds,
          temporary_block_duration_seconds:
            item.temporary_block_duration_seconds,
        },
      ]),
    );
    setSettingsByChatbot(next);
  }, [environmentId, initialSettings]);

  useEffect(() => {
    setSelectedChatbotId((current) => {
      if (current && chatbots.some((chatbot) => chatbot.id === current)) {
        return current;
      }
      return chatbots[0]?.id ?? '';
    });
  }, [chatbots]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const exampleChatbot = activeChatbot;
  const exampleEndpoint = exampleChatbot
    ? `${origin}/api/v1/chatbots/${exampleChatbot.public_slug}/messages`
    : `${origin}/api/v1/chatbots/<public-slug>/messages`;
  const exampleRequestBody = JSON.stringify(
    {
      messages: [{ role: 'user', content: 'Give me a concise answer.' }],
    },
    null,
    2,
  );
  const oversizeBody = JSON.stringify(
    {
      messages: [
        {
          role: 'user',
          content:
            'This payload is intentionally too large for the development scenario. Repeat this sentence until it exceeds the configured limit.',
        },
      ],
    },
    null,
    2,
  );

  function updateSettings(updater: (current: SettingsDraft) => SettingsDraft) {
    if (!activeChatbot) {
      return;
    }

    if (isControlled && onControlledSettingsChange) {
      onControlledSettingsChange(
        updater(controlledSettings ?? buildDefaultSettings(activeChatbot.id)),
      );
      return;
    }

    setSettingsByChatbot((current) => ({
      ...current,
      [activeChatbot.id]: updater(
        current[activeChatbot.id] ?? buildDefaultSettings(activeChatbot.id),
      ),
    }));
  }

  function setSettings(
    next: SettingsDraft | ((current: SettingsDraft) => SettingsDraft),
  ) {
    updateSettings(typeof next === 'function' ? next : () => next);
  }

  function persistSettings(
    nextSettings: SettingsDraft,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await upsertChatbotApiSettings({
        id: nextSettings.id,
        project_id: projectId,
        environment_id: environmentId,
        chatbot_id: nextSettings.chatbot_id,
        rate_limit_enabled: nextSettings.rate_limit_enabled,
        rate_limit_max_requests: nextSettings.rate_limit_max_requests,
        rate_limit_window_seconds: nextSettings.rate_limit_window_seconds,
        rate_limit_use_ip: nextSettings.rate_limit_use_ip,
        rate_limit_use_session_cookie:
          nextSettings.rate_limit_use_session_cookie,
        rate_limit_use_fingerprint: nextSettings.rate_limit_use_fingerprint,
        fingerprint_header_name: nextSettings.fingerprint_header_name,
        message_size_limit_enabled: nextSettings.message_size_limit_enabled,
        max_message_characters: nextSettings.max_message_characters,
        max_request_body_bytes: nextSettings.max_request_body_bytes,
        session_request_cap_enabled: nextSettings.session_request_cap_enabled,
        session_request_cap_max_requests:
          nextSettings.session_request_cap_max_requests,
        session_request_cap_window_seconds:
          nextSettings.session_request_cap_window_seconds,
        ip_daily_token_budget_enabled:
          nextSettings.ip_daily_token_budget_enabled,
        ip_daily_token_budget: nextSettings.ip_daily_token_budget,
        temporary_block_enabled: nextSettings.temporary_block_enabled,
        temporary_block_violation_threshold:
          nextSettings.temporary_block_violation_threshold,
        temporary_block_window_seconds:
          nextSettings.temporary_block_window_seconds,
        temporary_block_duration_seconds:
          nextSettings.temporary_block_duration_seconds,
      });

      if (!result.success) {
        toast(result.error.message || 'Failed to save chatbot API settings.');
        return;
      }

      setSettingsByChatbot((current) => ({
        ...current,
        [result.data.chatbot_id]: {
          id: result.data.id,
          chatbot_id: result.data.chatbot_id,
          rate_limit_enabled: result.data.rate_limit_enabled,
          rate_limit_max_requests: result.data.rate_limit_max_requests,
          rate_limit_window_seconds: result.data.rate_limit_window_seconds,
          rate_limit_use_ip: result.data.rate_limit_use_ip,
          rate_limit_use_session_cookie:
            result.data.rate_limit_use_session_cookie,
          rate_limit_use_fingerprint: result.data.rate_limit_use_fingerprint,
          fingerprint_header_name: result.data.fingerprint_header_name,
          message_size_limit_enabled: result.data.message_size_limit_enabled,
          max_message_characters: result.data.max_message_characters,
          max_request_body_bytes: result.data.max_request_body_bytes,
          session_request_cap_enabled: result.data.session_request_cap_enabled,
          session_request_cap_max_requests:
            result.data.session_request_cap_max_requests,
          session_request_cap_window_seconds:
            result.data.session_request_cap_window_seconds,
          ip_daily_token_budget_enabled:
            result.data.ip_daily_token_budget_enabled,
          ip_daily_token_budget: result.data.ip_daily_token_budget,
          temporary_block_enabled: result.data.temporary_block_enabled,
          temporary_block_violation_threshold:
            result.data.temporary_block_violation_threshold,
          temporary_block_window_seconds:
            result.data.temporary_block_window_seconds,
          temporary_block_duration_seconds:
            result.data.temporary_block_duration_seconds,
        },
      }));
      toast(successMessage);
    });
  }

  return (
    <div className="min-w-0 space-y-4">
      {!activeChatbot ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Add a chatbot to configure demo API protection.
        </div>
      ) : null}

      {!isEmbedded ? (
        <p className="text-sm text-muted-foreground">
          Demo chatbot endpoints are public per chatbot. Configure abuse
          protection, request caps, token budgets, and temporary blocking for
          the selected chatbot.
        </p>
      ) : null}

      {activeChatbot && showChatbotSelector ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Chatbot</label>
          <Select
            value={selectedChatbotId}
            onValueChange={setSelectedChatbotId}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select chatbot" />
            </SelectTrigger>
            <SelectContent>
              {chatbots.map((chatbot) => (
                <SelectItem key={chatbot.id} value={chatbot.id}>
                  {chatbot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Public endpoint: <code>{exampleEndpoint}</code>
          </p>
        </div>
      ) : null}

      {!activeChatbot || !settings ? null : (
        <>
          <SettingsAccordionSection
            title="Identity strategy"
            description="Build the rate-limit identity from one or more signals. If none resolve, the backend falls back to IP."
            defaultOpen
          >
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleRow
                title="IP address"
                description="Use the request IP as a limiter identity."
                checked={settings.rate_limit_use_ip}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    rate_limit_use_ip: checked,
                  }))
                }
              />
              <ToggleRow
                title="Session cookie"
                description="Use the browser session cookie when present."
                checked={settings.rate_limit_use_session_cookie}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    rate_limit_use_session_cookie: checked,
                  }))
                }
              />
              <ToggleRow
                title="Fingerprint"
                description="Use a caller-provided fingerprint header."
                checked={settings.rate_limit_use_fingerprint}
                onCheckedChange={(checked) =>
                  setSettings((current) => ({
                    ...current,
                    rate_limit_use_fingerprint: checked,
                  }))
                }
              />
            </div>

            {settings.rate_limit_use_fingerprint ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Fingerprint header name
                </label>
                <Input
                  value={settings.fingerprint_header_name}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      fingerprint_header_name: event.target.value,
                    }))
                  }
                  placeholder="x-client-fingerprint"
                />
                <p className="text-xs text-muted-foreground">
                  Public callers must send this header for fingerprint-based
                  enforcement.
                </p>
              </div>
            ) : null}
          </SettingsAccordionSection>

          <SettingsAccordionSection
            title="Request throttling"
            description="Short-window protection for public traffic bursts."
          >
            <ToggleRow
              title="Enable rate limiting"
              description="Return 429 when the configured threshold is exceeded."
              checked={settings.rate_limit_enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  rate_limit_enabled: checked,
                }))
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField
                label="Max requests"
                hint="Requests allowed per identity before 429 is returned."
                value={settings.rate_limit_max_requests}
                min={1}
                max={10000}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    rate_limit_max_requests: value,
                  }))
                }
              />
              <NumericField
                label="Window (seconds)"
                hint="Rolling request window."
                value={settings.rate_limit_window_seconds}
                min={1}
                max={86400}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    rate_limit_window_seconds: value,
                  }))
                }
              />
            </div>
          </SettingsAccordionSection>

          <SettingsAccordionSection
            title="Payload limits"
            description="Protect the backend from oversized prompts and request bodies."
          >
            <ToggleRow
              title="Enable message size limits"
              description="Reject oversized prompts and bodies before the model call runs."
              checked={settings.message_size_limit_enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  message_size_limit_enabled: checked,
                }))
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField
                label="Max message characters"
                hint="Total characters allowed across submitted messages."
                value={settings.max_message_characters}
                min={1}
                max={200000}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    max_message_characters: value,
                  }))
                }
              />
              <NumericField
                label="Max request body bytes"
                hint="Serialized body size allowed before 413 is returned."
                value={settings.max_request_body_bytes}
                min={1}
                max={1000000}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    max_request_body_bytes: value,
                  }))
                }
              />
            </div>
          </SettingsAccordionSection>

          <SettingsAccordionSection
            title="Per-session request cap"
            description="Separate cap for browser sessions when a session cookie is available."
          >
            <ToggleRow
              title="Enable per-session request cap"
              description="Count requests per browser session over a longer window."
              checked={settings.session_request_cap_enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  session_request_cap_enabled: checked,
                }))
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumericField
                label="Max requests per session"
                hint="Maximum requests allowed during the session cap window."
                value={settings.session_request_cap_max_requests}
                min={1}
                max={100000}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    session_request_cap_max_requests: value,
                  }))
                }
              />
              <NumericField
                label="Window (seconds)"
                hint="Time window used for the session cap."
                value={settings.session_request_cap_window_seconds}
                min={1}
                max={604800}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    session_request_cap_window_seconds: value,
                  }))
                }
              />
            </div>
          </SettingsAccordionSection>

          <SettingsAccordionSection
            title="Per-IP daily token budget"
            description="Limit estimated or reported token usage per IP across a 24-hour window."
          >
            <ToggleRow
              title="Enable daily token budget"
              description="Block requests after an IP consumes too many model tokens."
              checked={settings.ip_daily_token_budget_enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  ip_daily_token_budget_enabled: checked,
                }))
              }
            />

            <NumericField
              label="Daily token budget"
              hint="Maximum tokens allowed per IP every 24 hours."
              value={settings.ip_daily_token_budget}
              min={1}
              max={10000000}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  ip_daily_token_budget: value,
                }))
              }
            />
          </SettingsAccordionSection>

          <SettingsAccordionSection
            title="Temporary block"
            description="Escalate repeated abuse into a short cooldown block."
          >
            <ToggleRow
              title="Enable temporary block"
              description="Apply a temporary block after repeated limit violations."
              checked={settings.temporary_block_enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  temporary_block_enabled: checked,
                }))
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <NumericField
                label="Violation threshold"
                hint="How many violations trigger a temporary block."
                value={settings.temporary_block_violation_threshold}
                min={1}
                max={1000}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    temporary_block_violation_threshold: value,
                  }))
                }
              />
              <NumericField
                label="Violation window"
                hint="How long violations accumulate before resetting."
                value={settings.temporary_block_window_seconds}
                min={1}
                max={604800}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    temporary_block_window_seconds: value,
                  }))
                }
              />
              <NumericField
                label="Block duration"
                hint="How long the cooldown block lasts."
                value={settings.temporary_block_duration_seconds}
                min={1}
                max={604800}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    temporary_block_duration_seconds: value,
                  }))
                }
              />
            </div>
          </SettingsAccordionSection>

          {isDevelopment && !isEmbedded ? (
            <div className="space-y-4 rounded-xl border border-dashed p-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">
                  Development test scenario
                </h3>
                <p className="text-xs text-muted-foreground">
                  Apply a focused local preset, then hit the public endpoint
                  with the sample requests below.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(DEV_TEST_PRESETS).map(([key, preset]) => (
                  <div key={key} className="rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      disabled={isPending}
                      onClick={() => {
                        const nextSettings = {
                          ...settings,
                          ...preset.overrides,
                        };
                        setSettings(nextSettings);
                        persistSettings(
                          nextSettings,
                          `${preset.label} preset saved.`,
                        );
                      }}
                    >
                      Apply preset
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>
                  Example chatbot:{' '}
                  <span className="font-medium text-foreground">
                    {exampleChatbot
                      ? `${exampleChatbot.name} (${exampleChatbot.public_slug})`
                      : 'Create a chatbot to see a real endpoint here.'}
                  </span>
                </p>
                <p>
                  Endpoint: <code>{exampleEndpoint}</code>
                </p>
                <p>
                  1. Apply a preset. 2. Send the sample request. 3. Repeat it
                  until the expected 429 or 413 appears.
                </p>
                <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] text-foreground">
                  {`curl -i -X POST '${exampleEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-forwarded-for: 203.0.113.10' \\
  --data '${exampleRequestBody.replace(/'/g, "'\\''")}'`}
                </pre>
                <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] text-foreground">
                  {`curl -i -X POST '${exampleEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-forwarded-for: 203.0.113.10' \\
  --data '${oversizeBody.replace(/'/g, "'\\''")}'`}
                </pre>
                <p>
                  Use a different <code>x-forwarded-for</code> value or a
                  different fingerprint header to simulate another caller
                  identity during local testing.
                </p>
              </div>
            </div>
          ) : null}

          {showSaveButton && !isControlled ? (
            <Button
              disabled={isPending}
              onClick={() =>
                persistSettings(
                  settings,
                  `${activeChatbot.name} API settings saved.`,
                )
              }
            >
              Save chatbot API settings
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
