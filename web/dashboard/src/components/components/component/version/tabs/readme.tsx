'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ComponentAsset, ComponentVersion } from '@/data/components/dto';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadmeProps {
  selectedVersion: ComponentVersion;
  assets: ComponentAsset[];
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
});

const absoluteTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const RELATIVE_DIVISIONS: Array<{
  amount: number;
  unit: Intl.RelativeTimeFormatUnit;
}> = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeTime(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  let duration = (date.getTime() - Date.now()) / 1000;

  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return null;
}

function formatAbsoluteTime(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  return absoluteTimeFormatter.format(date);
}

const assetTypeLabels: Record<string, string> = {
  css: 'Stylesheet',
  js: 'JavaScript',
  chunk: 'Chunk',
  server: 'Server',
  other: 'Asset',
};

function getAssetTypeLabel(type: ComponentAsset['type'] | 'other'): string {
  if (!type) {
    return assetTypeLabels.other;
  }

  return assetTypeLabels[type] ?? assetTypeLabels.other;
}

function getAssetDisplayName(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/');
    const name = segments.at(-1);
    if (name && name.trim().length > 0) {
      return name;
    }
    return parsed.hostname;
  } catch (error) {
    const fallbackSegments = url.split('/');
    const name = fallbackSegments.at(-1);
    return name && name.trim().length > 0 ? name : url;
  }
}

const Readme: React.FC<ReadmeProps> = ({ selectedVersion, assets }) => {
  const createdAt = toDate(selectedVersion.created_at);
  const relativeTime = formatRelativeTime(createdAt);
  const absoluteTime = formatAbsoluteTime(createdAt);
  const readmeContent = selectedVersion.readme?.trim();
  const changelogContent = selectedVersion.changelog?.trim();
  const assetCounts = assets.reduce<Record<string, number>>((acc, asset) => {
    const key = asset.type ?? 'other';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="flex-1">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-xl font-semibold">README</CardTitle>
            <Badge variant="secondary">v{selectedVersion.version}</Badge>
          </div>
          {(relativeTime || absoluteTime) && (
            <CardDescription>
              {relativeTime ? `Updated ${relativeTime}` : 'Updated'}
              {absoluteTime ? ` • ${absoluteTime}` : ''}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {readmeContent ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <ReactMarkdown
                components={{
                  h1: ({ className, ...props }) => (
                    <h1
                      className={cn(
                        'pt-4 text-3xl font-semibold tracking-tight text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  h2: ({ className, ...props }) => (
                    <h2
                      className={cn(
                        'pt-4 text-2xl font-semibold tracking-tight text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  h3: ({ className, ...props }) => (
                    <h3
                      className={cn(
                        'pt-3 text-xl font-semibold tracking-tight text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  h4: ({ className, ...props }) => (
                    <h4
                      className={cn(
                        'pt-3 text-lg font-semibold tracking-tight text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  p: ({ className, ...props }) => (
                    <p
                      className={cn(
                        'leading-7 text-base text-muted-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  ul: ({ className, ...props }) => (
                    <ul
                      className={cn(
                        'ml-5 list-disc leading-7 text-base text-muted-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  ol: ({ className, ...props }) => (
                    <ol
                      className={cn(
                        'ml-5 list-decimal leading-7 text-base text-muted-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  li: ({ className, ...props }) => (
                    <li className={cn('mt-1', className)} {...props} />
                  ),
                  code: ({ className, ...props }) => (
                    <code
                      className={cn(
                        'rounded bg-muted px-1 py-0.5 font-mono text-sm text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  pre: ({ className, ...props }) => (
                    <pre
                      className={cn(
                        'mb-4 overflow-x-auto rounded-md bg-muted p-4 text-sm text-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  blockquote: ({ className, ...props }) => (
                    <blockquote
                      className={cn(
                        'border-l-4 border-muted pl-4 text-base italic text-muted-foreground',
                        className,
                      )}
                      {...props}
                    />
                  ),
                  a: ({ className, ...props }) => (
                    <a
                      className={cn(
                        'font-medium text-primary underline underline-offset-4',
                        className,
                      )}
                      {...props}
                    />
                  ),
                }}
              >
                {readmeContent}
              </ReactMarkdown>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <CardTitle className="text-lg">No README provided</CardTitle>
              <CardDescription>
                Publish a new version with documentation to see it here.
              </CardDescription>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:w-80">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-base">Version details</CardTitle>
            <CardDescription>
              Metadata for this component release.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium text-foreground">
                  {selectedVersion.version}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-foreground">
                  {absoluteTime ?? 'Unknown'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Relative</dt>
                <dd className="font-medium text-foreground">
                  {relativeTime ?? 'Unknown'}
                </dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/components/${selectedVersion.component_id}/versions/${selectedVersion.id}/preview`}
              >
                Open preview
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-base">Assets</CardTitle>
            <CardDescription>
              Bundled files shipped with this version.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {assets.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(assetCounts).map(([type, count]) => (
                    <Badge key={type} variant="outline">
                      {getAssetTypeLabel(type as ComponentAsset['type'])} ·{' '}
                      {count}
                    </Badge>
                  ))}
                </div>
                <ScrollArea className="max-h-48 pr-2">
                  <div className="flex flex-col gap-2">
                    {assets.map((asset) => (
                      <Button
                        key={asset.id}
                        asChild
                        variant="ghost"
                        size="sm"
                        className="justify-between"
                      >
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {getAssetTypeLabel(asset.type)}
                            </Badge>
                            <span className="truncate text-left">
                              {getAssetDisplayName(asset.url)}
                            </span>
                          </span>
                          <ExternalLink data-icon="inline-end" />
                        </a>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assets registered for this version.
              </p>
            )}
          </CardContent>
        </Card>

        {changelogContent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Changelog</CardTitle>
              <CardDescription>Highlights for this release.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                {changelogContent.length > 320
                  ? `${changelogContent.slice(0, 317)}...`
                  : changelogContent}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Readme;
