"use client"

import CardViewDisabledIcon from '@/components/ui/icons/CardViewDisabledIcon';
import ListViewIcon from '@/components/ui/icons/ListViewIcon';
import React, { useState } from 'react';
import ListViewDisabledIcon from '@/components/ui/icons/ListViewDisabledIcon';
import CardViewIcon from '@/components/ui/icons/CardViewIcon';
import { useViewMode } from '@/components/components/projects/ProjectsViewProvider';

export function ToogleIconViewProjects() {
  const { viewMode, toggleViewMode } = useViewMode();
  const isListView = viewMode === 'list';

  return (
    <div className="flex items-center ml-1">
      <button className="mr-1" onClick={toggleViewMode}>
        {!isListView ? (
          <CardViewIcon width={30} height={30} />
        ) : (
          <CardViewDisabledIcon width={30} height={30} />
        )}
      </button>
      <button onClick={toggleViewMode}>
        {isListView ? (
          <ListViewIcon width={30} height={30} />
        ) : (
          <ListViewDisabledIcon width={30} height={30} />
        )}
      </button>
    </div>
  );
}

