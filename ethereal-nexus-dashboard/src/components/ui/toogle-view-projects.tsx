"use client"

import CardViewDisabledIcon from '@/components/ui/icons/CardViewDisabledIcon';
import ListViewIcon from '@/components/ui/icons/ListViewIcon';
import React, { useState } from 'react';
import ListViewDisabledIcon from '@/components/ui/icons/ListViewDisabledIcon';
import CardViewIcon from '@/components/ui/icons/CardViewIcon';

export function ToogleViewProjects() {
  const [viewMode, setViewMode] = useState('list'); // Initial view mode

  const toggleViewMode = () => {
    setViewMode(prevMode => (prevMode === 'card' ? 'list' : 'card'));
  };

  const isCardView = viewMode === 'card';

  return (
    <div className="flex items-center ml-1">
      <button className="mr-1" onClick={toggleViewMode}>
        {isCardView ? (
          <ListViewDisabledIcon width={30} height={30} />
        ) : (
          <CardViewDisabledIcon width={30} height={30} />
        )}
      </button>
      <button onClick={toggleViewMode}>
        {isCardView ? (
          <CardViewIcon width={30} height={30} />
        ) : (
          <ListViewIcon width={30} height={30} />
        )}
      </button>
    </div>
  );
}

