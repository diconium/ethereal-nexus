'use client'

import React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserForm from '@/components/user/user-form';
import { useRouter } from 'next/navigation';
import ProjectsForm from '@/components/projects/project-form';

export default function NewProjectModal() {
  const router = useRouter();

  return <Dialog open={true} onOpenChange={router.back}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Projects</DialogTitle>
        <DialogDescription>
          Create a new Project
        </DialogDescription>
      </DialogHeader>
      <ProjectsForm onComplete={router.back}/>
    </DialogContent>
  </Dialog>
}
