import Events from '@/components/components/component/version/tabs/events';
import React from 'react';
import { getResourceEvents } from '@/data/events/actions';

export const ProjectEvents = async ({ id, filter }) => {
  const events = await getResourceEvents(id, 20, filter);
  return <Events isComponentView={false} events={events.success ? events.data : []}></Events>;
};

