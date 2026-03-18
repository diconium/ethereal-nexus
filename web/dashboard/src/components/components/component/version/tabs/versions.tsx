'use client';

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
import { ComponentVersion } from '@/data/components/dto';

type VersionsProps = {
  versions: ComponentVersion[];
  componentId: string;
  selectedVersionId: string;
};

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

const Versions: React.FC<VersionsProps> = ({
  versions,
  componentId,
  selectedVersionId,
}) => {
  if (!versions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No versions found</CardTitle>
          <CardDescription>
            Publish a new version to see it listed here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sortedVersions = [...versions].sort((a, b) => {
    const aDate = toDate(a.created_at)?.getTime() ?? 0;
    const bDate = toDate(b.created_at)?.getTime() ?? 0;
    return bDate - aDate;
  });

  const latestVersionId = sortedVersions[0]?.id;

  return (
    <div className="flex flex-col gap-4">
      {sortedVersions.map((version) => {
        const createdAt = toDate(version.created_at);
        const relativeTime = formatRelativeTime(createdAt);
        const absoluteTime = formatAbsoluteTime(createdAt);
        const changelog = version.changelog?.trim();
        const isCurrent = version.id === selectedVersionId;
        const isLatest = version.id === latestVersionId;

        return (
          <Card key={version.id} className="border-muted">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      {version.version}
                    </CardTitle>
                    {isLatest && <Badge>Latest</Badge>}
                    {isCurrent && <Badge variant="secondary">Current</Badge>}
                  </div>
                  {(relativeTime || absoluteTime) && (
                    <CardDescription>
                      {relativeTime ? `Published ${relativeTime}` : 'Published'}
                      {absoluteTime ? ` • ${absoluteTime}` : ''}
                    </CardDescription>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/components/${componentId}/versions/${version.id}/readme`}
                  >
                    View version
                  </Link>
                </Button>
              </div>
            </CardHeader>
            {changelog && (
              <CardContent>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Changelog
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {changelog.length > 280
                      ? `${changelog.slice(0, 277)}...`
                      : changelog}
                  </p>
                </div>
              </CardContent>
            )}
            <CardFooter>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Version ID: {version.id}</span>
                <span>•</span>
                <span>Created at: {absoluteTime ?? 'Unknown'}</span>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default Versions;
