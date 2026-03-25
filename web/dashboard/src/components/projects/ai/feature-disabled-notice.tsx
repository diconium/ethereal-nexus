import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type FeatureDisabledNoticeProps = {
  projectId: string;
  title: string;
  environmentId?: string;
};

export function FeatureDisabledNotice({
  projectId,
  title,
  environmentId,
}: FeatureDisabledNoticeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} is disabled</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enable this AI feature in the project settings before using it in an
          environment.
        </p>
        <Link
          href={`/projects/${projectId}/settings?section=ai${environmentId ? `&env=${environmentId}` : ''}`}
          className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Open AI settings
        </Link>
      </CardContent>
    </Card>
  );
}
