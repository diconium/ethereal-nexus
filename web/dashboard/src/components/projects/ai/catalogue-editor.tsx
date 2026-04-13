'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  activateCatalogueVersion,
  generateCatalogueVersionWithAi,
  saveCatalogueVersion,
} from '@/data/ai/actions';
import { normalizeCatalogueApiPath } from '@/data/ai/catalogue-endpoint';
import type { Catalogue } from '@/data/ai/dto';
import type {
  CatalogueData,
  CatalogueVersionSummary,
} from '@/data/ai/catalogue';

type CatalogueEditorProps = {
  projectId: string;
  environmentId: string;
  catalogue: Catalogue;
  initialData: CatalogueData;
  versions: CatalogueVersionSummary[];
};

export function CatalogueEditor({
  projectId,
  environmentId,
  catalogue,
  initialData,
  versions,
}: CatalogueEditorProps) {
  const [raw, setRaw] = useState(JSON.stringify(initialData, null, 2));
  const [versionList, setVersionList] = useState(versions);
  const [isPending, startTransition] = useTransition();
  const publicEndpoint =
    normalizeCatalogueApiPath(catalogue.api_url, catalogue.slug) ||
    `/api/v1/${catalogue.slug}`;

  const isJsonValid = useMemo(() => {
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }, [raw]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/projects/${projectId}/ai/catalogues?env=${environmentId}`}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Back to catalogues
          </Link>
          <div>
            <h2 className="text-2xl font-semibold">{catalogue.name}</h2>
            <p className="text-sm text-muted-foreground">
              Versioned JSON catalogue editor scoped to the selected
              environment.
            </p>
            <p className="mt-2 break-all text-xs text-muted-foreground">
              GET <code>{publicEndpoint}</code>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (!isJsonValid) {
                toast('Fix the JSON before saving a version.');
                return;
              }

              startTransition(async () => {
                const parsed = JSON.parse(raw);
                const result = await saveCatalogueVersion(
                  projectId,
                  catalogue.id,
                  parsed,
                );
                if (!result.success) {
                  toast(result.error.message || 'Failed to save version.');
                  return;
                }
                setVersionList((current) => [
                  {
                    id: result.data.id,
                    created_at: result.data.created_at.toISOString(),
                    item_count: result.data.data.items.length,
                  },
                  ...current,
                ]);
                toast('Catalogue version saved.');
              });
            }}
          >
            Save JSON
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await generateCatalogueVersionWithAi(
                  projectId,
                  catalogue.id,
                );
                if (!result.success) {
                  toast(
                    result.error.message ||
                      'Failed to generate catalogue version.',
                  );
                  return;
                }
                setRaw(JSON.stringify(result.data.data, null, 2));
                setVersionList((current) => [
                  {
                    id: result.data.id,
                    created_at: result.data.created_at.toISOString(),
                    item_count: result.data.data.items.length,
                  },
                  ...current,
                ]);
                toast('Catalogue version generated.');
              });
            }}
          >
            {isPending ? 'Working...' : 'Call agent'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogue JSON</CardTitle>
            <CardDescription>
              Edit the stored version payload directly. The data schema remains
              compatible with the donor feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              spellCheck={false}
              className="min-h-[640px] w-full rounded-md border bg-muted/30 p-4 font-mono text-sm focus:outline-none"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
            <CardDescription>
              Reactivate a previous version or keep using the latest one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!versionList.length ? (
              <p className="text-sm text-muted-foreground">
                No saved versions yet.
              </p>
            ) : (
              versionList.map((version) => (
                <div key={version.id} className="rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {version.item_count} items
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await activateCatalogueVersion(
                          projectId,
                          version.id,
                        );
                        if (!result.success) {
                          toast(
                            result.error.message ||
                              'Failed to activate version.',
                          );
                          return;
                        }
                        setRaw(JSON.stringify(result.data.data, null, 2));
                        setVersionList((current) => [
                          {
                            id: result.data.id,
                            created_at: result.data.created_at.toISOString(),
                            item_count: result.data.data.items.length,
                          },
                          ...current,
                        ]);
                        toast('Version activated as latest.');
                      });
                    }}
                  >
                    Activate version
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
