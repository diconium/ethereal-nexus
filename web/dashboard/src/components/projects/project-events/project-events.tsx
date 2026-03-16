import Events from '@/components/components/component/version/tabs/events';
import React from 'react';
import { queryResourceEvents } from '@/data/events/actions';

interface ProjectEventsProps {
  id: string;
  pageIndex?: number;
  pageSize?: number;
  userId?: string;
  componentId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortDir?: string;
  globalFilter?: string;
}

export const ProjectEvents = async ({
  id,
  pageIndex = 0,
  pageSize = 10,
  userId = undefined,
  componentId = undefined,
  type = undefined,
  startDate = undefined,
  endDate = undefined,
  sortField = undefined,
  sortDir = undefined,
  globalFilter = '',
}: ProjectEventsProps) => {
  return null;
};
