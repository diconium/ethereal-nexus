import Events from '@/components/components/component/version/tabs/events';
import React from 'react';
import { getResourceEvents } from '@/data/events/actions';
import { getComponents } from '@/data/components/actions';
import { getComponentsNotInEnvironment, getEnvironmentComponents, getEnvironmentsByProject } from '@/data/projects/actions';
import { auth } from '@/auth';

export const ProjectEvents = async ({ id, filter, environment }) => {
  const events = await getResourceEvents(id, 20, filter);
  
  //FIXME: ir buscar os componentes e os users para passar aos eventos a fim de preencher o filtro
  const environments = await getEnvironmentsByProject(id);
  if (!environments.success) {
    throw new Error(environments.error.message);
  }
  const selected = environment || environments.data[0].id;
  const components = await getEnvironmentComponents(selected);

  return <Events isComponentView={false} events={events.success ? events.data : []} components={components}></Events>;
};

