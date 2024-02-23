import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { ApiKeyForm } from '@/components/user/api-key-table/api-key-form';
import React from 'react';
import { getApiKeyById } from '@/data/users/actions';

export default async function ApiKeyPage({ params: { key } }: any) {
  const session = await auth()
  const projects = await getProjects(session?.user?.id)
  const apiKey = await getApiKeyById(key)

  if(!apiKey.success) {
    notFound()
  }

  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Edit API Key</h3>
        <p className="text-sm text-muted-foreground">
          Edit the API Key for your user. The key value will not be displayed again, but you can edit it&apos;s
          permissions.
        </p>
      </div>
      <ApiKeyForm apyKey={apiKey.data} availableProjects={projects.success ? projects.data : []} />
    </div>
  );
}
