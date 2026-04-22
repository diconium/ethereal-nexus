'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { upsertContentAdvisorSettings } from '@/data/ai/actions';
import type { ContentAdvisorSettings } from '@/data/ai/dto';

type Props = {
  projectId: string;
  environmentId: string;
  initialSettings: ContentAdvisorSettings | null;
};

export function ContentAdvisorSettingsSection({
  projectId,
  environmentId,
  initialSettings,
}: Props) {
  const [enabled, setEnabled] = useState(
    Boolean(initialSettings?.auto_resolve_after_runs),
  );
  const [threshold, setThreshold] = useState(
    initialSettings?.auto_resolve_after_runs?.toString() || '3',
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEnabled(Boolean(initialSettings?.auto_resolve_after_runs));
    setThreshold(initialSettings?.auto_resolve_after_runs?.toString() || '3');
  }, [initialSettings, environmentId]);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Auto-resolve stale issues
          </p>
          <p className="text-xs text-muted-foreground">
            Automatically move open issues to Done when they are not detected
            for a configured number of runs.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={isPending}
        />
      </div>

      {enabled ? (
        <div className="mt-4 max-w-xs space-y-2">
          <label className="text-sm font-medium">Runs without detection</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            disabled={isPending}
          />
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const nextThreshold = enabled ? Number(threshold || 0) : 0;
              const result = await upsertContentAdvisorSettings({
                project_id: projectId,
                environment_id: environmentId,
                auto_resolve_after_runs:
                  enabled && nextThreshold > 0 ? nextThreshold : null,
              });

              if (!result.success) {
                toast(
                  result.error.message ||
                    'Failed to save content advisor auto-resolve settings.',
                );
                return;
              }

              setEnabled(Boolean(result.data.auto_resolve_after_runs));
              setThreshold(
                result.data.auto_resolve_after_runs?.toString() || '3',
              );
              toast('Content Advisor settings saved.');
            });
          }}
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
