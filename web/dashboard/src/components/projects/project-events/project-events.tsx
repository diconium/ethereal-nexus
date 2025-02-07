import Events from '@/components/components/component/version/tabs/events';
import React from 'react';
import { getResourceEvents } from '@/data/events/actions';

export const ProjectEvents = async ({ id }) => {
  const events = await getResourceEvents(id, 20);
  return <Events events={events.success ? events.data : []}></Events>;
};

