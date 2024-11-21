import { getProjects } from '@/data/projects/actions';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { ApiKeyForm } from '@/components/user/api-key-table/api-key-form';
import React from 'react';
import { getApiKeyById } from '@/data/users/actions';

export default async function ApiKeyPage({ params: { key } }: any) {
  const session = await auth()
  const projects = await getProjects()
  const apiKey = await getApiKeyById(key)

  if(!apiKey.success) {
    notFound()
  }

  return (
    <div className="container space-y-6">
      <ApiKeyForm apyKey={apiKey.data} availableProjects={projects.success ? projects.data : []} />
    </div>
  );
}
