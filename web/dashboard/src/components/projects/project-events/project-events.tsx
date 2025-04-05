import Events from '@/components/components/component/version/tabs/events';
import React from 'react';
import { getResourceEvents } from '@/data/events/actions';
import { getEnvironmentComponents, getEnvironmentsByProject } from '@/data/projects/actions';
import { getMembersByResourceId } from '@/data/member/actions';
import { getUsers } from '@/data/users/actions';
import { notFound } from 'next/navigation';

export const ProjectEvents = async ({ id, filter, environment }) => {  
  const environments = await getEnvironmentsByProject(id);
  if (!environments.success) {
    throw new Error(environments.error.message);
  }
  const selected = environment || environments.data[0].id;
  const components = await getEnvironmentComponents(selected);

    if (!components.success) {
      notFound();
    }

  const members = await getMembersByResourceId(id);
  const users = await getUsers()

  if(!members.success || !users.success) {
    throw new Error('Users are not available.')
  }

  const events = await getResourceEvents(id, 20, filter, environment || environments.data[0]);

  //FIXME: components.data is giving a lint error
  return <Events isComponentView={false} events={events.success ? events.data : []} components={components.data} members={members.data}></Events>;
};

