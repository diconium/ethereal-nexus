import { Separator } from "@/components/ui/separator";
import React from 'react';
import ProjectsForm from '@/components/projects/project-form';

export default async function NewProject() {
  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Projects</h3>
        <p className="text-sm text-muted-foreground">
          Create a new Project
        </p>
      </div>
      <Separator />
      <ProjectsForm />
    </div>
  );
}