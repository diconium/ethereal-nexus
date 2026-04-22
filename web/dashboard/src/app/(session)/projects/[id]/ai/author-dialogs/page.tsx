import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import {
  getEnvironmentsByProject,
  getProjectById,
} from '@/data/projects/actions';
import {
  getAuthorDialogsByEnvironment,
  getProjectAiFlags,
} from '@/data/ai/actions';
import { FeatureDisabledNotice } from '@/components/projects/ai/feature-disabled-notice';
import { AuthorDialogsWorkspace } from '@/components/projects/ai/author-dialogs-workspace';
import { AiErrorNotice } from '@/components/projects/ai/ai-error-notice';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectAiAuthorDialogsPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id } = await params;
  const query = await searchParams;
  const env = Array.isArray(query.env) ? query.env[0] : query.env;

  const [project, environments] = await Promise.all([
    getProjectById(id),
    getEnvironmentsByProject(id),
  ]);

  if (!project.success) {
    notFound();
  }
  if (!environments.success) {
    const message = environments.error.message;

    return (
      <AiErrorNotice
        title="Unable to load AI author dialogs"
        message={message}
      />
    );
  }

  const selectedEnvironment =
    environments.data.find((environment) => environment.id === env) ||
    environments.data[0];
  const flagsResult = selectedEnvironment
    ? await getProjectAiFlags(id, selectedEnvironment.id)
    : null;
  if (selectedEnvironment && (!flagsResult || !flagsResult.success)) {
    return (
      <AiErrorNotice
        title="Unable to load AI author dialogs"
        message={
          flagsResult?.success
            ? 'Failed to load AI author dialogs.'
            : (flagsResult?.error.message ??
              'Failed to load AI author dialogs.')
        }
      />
    );
  }
  const flags = flagsResult?.success ? flagsResult.data : [];
  const featureFlag = flags.find((flag) => flag.key === 'author-dialogs');
  const dialogs = selectedEnvironment
    ? await getAuthorDialogsByEnvironment(id, selectedEnvironment.id)
    : null;

  return (
    <div className="space-y-6">
      {!featureFlag?.enabled ? (
        <FeatureDisabledNotice
          projectId={id}
          title="Author Dialogs"
          environmentId={selectedEnvironment?.id}
        />
      ) : !selectedEnvironment ? (
        <FeatureDisabledNotice projectId={id} title="Author Dialogs" />
      ) : dialogs?.success ? (
        <AuthorDialogsWorkspace
          projectId={id}
          environmentId={selectedEnvironment.id}
          dialogs={dialogs.data}
        />
      ) : (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Unable to load author dialogs for this environment.
        </div>
      )}
    </div>
  );
}
