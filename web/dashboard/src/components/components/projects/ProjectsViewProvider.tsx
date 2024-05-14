"use client"
import React, { createContext, useContext, useState } from 'react';
import { ProjectsViewType } from '@/utils/entities/projects-view';

const ProjectsViewContext = createContext<ProjectsViewType>({ viewMode: 'list',   toggleViewMode: () => {}});

export const ProjectsViewProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState('list');

  const toggleViewMode = () => {
    setViewMode(prevMode => (prevMode === 'card' ? 'list' : 'card'));
  };

  return (
    <ProjectsViewContext.Provider value={{ viewMode, toggleViewMode }}>
      {children}
    </ProjectsViewContext.Provider>
  );
};

export const useViewMode = () => useContext(ProjectsViewContext);
