import React from "react";
import ApiKeyModal from './modal';
import { auth } from '@/auth';
import { getProjects } from '@/data/projects/actions';
import { getApiKeyById } from '@/data/users/actions';
import { notFound } from 'next/navigation';

export default async function ApiKeyPageModalPage({ params: { key } }) {
  const session = await auth()
  const projects = await getProjects(session?.user?.id)
  const apiKey = await getApiKeyById(key)

  if(!apiKey.success) {
    notFound()
  }

  return <ApiKeyModal apyKey={apiKey.data} projects={projects.success ? projects.data : []} />
}
