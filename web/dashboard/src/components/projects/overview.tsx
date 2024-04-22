"use client"

import React, { useState } from 'react';
import { ProjectInput } from '@/data/projects/dto';
import ProjectsForm from '@/components/projects/project-form';
import { Button } from '@/components/ui/button';

type OverviewProps = {
  project: ProjectInput,
}
export function Overview ({ project }: OverviewProps) {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleEditToggle = () => setIsEditMode((prevState) => !prevState);

  return (
    <>
      {
        isEditMode ? (
          <div className="max-w-md">
            <ProjectsForm
              project={project}
              onCancel={handleEditToggle}
            />
          </div>
        ) : (
          <>
            <h2 className="text-4xl font-bold tracking-tight">{project.name}</h2>
            <p className="text-sm font-bold mt-8 transition-colors text-muted-foreground">Description</p>
            <p className="mt-2">{project.description}</p>
            <Button onClick={handleEditToggle} variant="text" className="text-orange-500 font-bold text-base p-0 mt-8">
              Edit
            </Button>
          </>
        )
      }
    </>
  )
};

