"use client"

import React from 'react';
import CardViewDisabledIcon from '@/components/ui/icons/CardViewDisabledIcon';
import ListViewIcon from '@/components/ui/icons/ListViewIcon';
import ListViewDisabledIcon from '@/components/ui/icons/ListViewDisabledIcon';
import CardViewIcon from '@/components/ui/icons/CardViewIcon';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';

export function ToogleIconViewProjects() {
  const { viewMode, toggleViewMode } = useViewMode();
  const isListView = viewMode === 'list';

  return (
    <div className="flex items-center h-12 p-1 bg-gray-300 rounded-full">
      <button className="mr-1" onClick={toggleViewMode}>
        {!isListView ? (
          <CardViewIcon width={40} height={40} />
        ) : (
          <CardViewDisabledIcon width={40} height={40} />
        )}
      </button>
      <button onClick={toggleViewMode}>
        {isListView ? (
          <ListViewIcon width={40} height={40} />
        ) : (
          <ListViewDisabledIcon width={40} height={40} />
        )}
      </button>
    </div>
  );
}

