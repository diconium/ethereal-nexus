'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { upsertProjectAiFlag } from '@/data/ai/actions';
import type { ProjectAiFeatureFlag } from '@/data/ai/dto';
import { AI_STATE_UPDATED_EVENT } from '@/lib/ai-events';
import { toast } from 'sonner';

type FeatureFlagsSectionProps = {
  projectId: string;
  environmentId: string;
  flags: ProjectAiFeatureFlag[];
};

const FLAG_COPY: Record<string, { title: string; description: string }> = {
  chatbots: {
    title: 'Chat bots',
    description:
      'Enable chatbot registrations and talk endpoints for this project.',
  },
  catalogues: {
    title: 'Catalogues',
    description: 'Enable catalogue creation, editing, and version management.',
  },
  'author-dialogs': {
    title: 'Author Dialogs',
    description: 'Enable conversational authoring workspaces for this project.',
  },
  'content-advisor': {
    title: 'Content Advisor',
    description:
      'Enable agents, schedules, and issue reviews for page analysis.',
  },
  demos: {
    title: 'Demos',
    description:
      'Enable the demos sidebar section and expose chatbot demo pages for this environment.',
  },
};

export function FeatureFlagsSection({
  projectId,
  environmentId,
  flags,
}: FeatureFlagsSectionProps) {
  const router = useRouter();
  const initialState = useMemo(
    () => Object.fromEntries(flags.map((flag) => [flag.key, flag.enabled])),
    [flags],
  );
  const previousEnvironmentId = useRef(environmentId);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (previousEnvironmentId.current === environmentId) {
      return;
    }

    previousEnvironmentId.current = environmentId;
    setOverrides({});
    setPendingKey(null);
  }, [environmentId]);

  useEffect(() => {
    setOverrides((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key, value]) => initialState[key] !== value,
        ),
      ),
    );
  }, [initialState]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Control which AI sections are available in this environment. All
        features stay off by default until explicitly enabled.
      </p>
      {flags.map((flag) => {
        const copy = FLAG_COPY[flag.key];
        const checked = overrides[flag.key] ?? initialState[flag.key] ?? false;
        const disabled = isPending && pendingKey === flag.key;

        return (
          <div
            key={flag.key}
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div className="space-y-1">
              <Label htmlFor={`ai-flag-${flag.key}`} className="text-base">
                {copy.title}
              </Label>
              <p className="text-sm text-muted-foreground">
                {copy.description}
              </p>
            </div>
            <Switch
              id={`ai-flag-${flag.key}`}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(enabled) => {
                setOverrides((current) => ({
                  ...current,
                  [flag.key]: enabled,
                }));
                setPendingKey(flag.key);
                startTransition(async () => {
                  const result = await upsertProjectAiFlag({
                    project_id: projectId,
                    environment_id: environmentId,
                    key: flag.key,
                    enabled,
                  });
                  setPendingKey(null);

                  if (!result.success) {
                    setOverrides((current) => {
                      const next = { ...current };
                      delete next[flag.key];
                      return next;
                    });
                    toast(
                      result.error.message ||
                        'Failed to update AI feature flag.',
                    );
                    return;
                  }

                  window.dispatchEvent(new CustomEvent(AI_STATE_UPDATED_EVENT));

                  toast(`${copy.title} ${enabled ? 'enabled' : 'disabled'}.`);
                  router.refresh();
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
