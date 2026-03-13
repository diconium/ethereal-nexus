import { Separator } from '@/components/ui/separator';
import React from 'react';
import ProjectsForm from '@/components/projects/project-form';

export default async function NewProject() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">New Project</h1>
        <p className="text-muted-foreground">Create a new Project</p>
      </div>
      <Separator />
      <ProjectsForm />
    </div>
  );
}
