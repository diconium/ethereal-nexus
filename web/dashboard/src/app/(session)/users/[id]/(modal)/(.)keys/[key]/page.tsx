import React from "react";
import ApiKeyModal from './modal';
import { getProjects } from '@/data/projects/actions';
import { getApiKeyById } from '@/data/users/actions';
import { notFound } from 'next/navigation';

export default async function ApiKeyPageModalPage(props) {
  const {
    key
  } = await props.params;

  const projects = await getProjects()
  const apiKey = await getApiKeyById(key)

  if(!apiKey.success) {
    notFound()
  }

  return <ApiKeyModal apyKey={apiKey.data} projects={projects.success ? projects.data : []} />
}
