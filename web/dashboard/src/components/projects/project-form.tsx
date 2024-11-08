'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/text-area';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ProjectInput, projectInputSchema } from '@/data/projects/dto';
import { upsertProject } from '@/data/projects/actions';
import { useSession } from 'next-auth/react';

type ProjectsFormProps = {
  project?: ProjectInput,
  onComplete?: () => void,
  onCancel?: () => void,
}

export default function ProjectsForm({ project, onComplete, onCancel }: ProjectsFormProps) {
  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || (project?.id && session?.permissions && ['write', 'manage'].includes(session?.permissions[project.id] || ''));

  const { toast } = useToast();
  const form: any = useForm<ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: project ?? {}
  });
  const onSubmit = async (data: ProjectInput) => {
    const projects = await upsertProject({
      id: project?.id,
      ...data
    });
    if (!projects.success) {
      toast({
        title: `Failed to ${data.id ? 'update' : 'create'} project "${data.name}"!`
      });
    }

    toast({
      title: `Project ${project?.id ? 'update' : 'create'}d successfully!`
    });

    if (onComplete) {
      onComplete();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Name</FormLabel>
              <FormControl>
                <Input disabled={!hasWritePermissions} placeholder="Name" {...field} className="bg-white dark:bg-transparent font-bold" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Description</FormLabel>
              <FormControl>
                <TextArea disabled={!hasWritePermissions} placeholder="Description" {...field} rows={5} className="bg-white dark:bg-transparent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-14">
          {
            onCancel && (
              <Button onClick={onCancel} variant="text" className="text-orange-500 font-bold text-base p-0">
                Cancel
              </Button>
            )
          }
          <Button disabled={!hasWritePermissions} type="submit" variant="primary"
                  size="base">{`${project?.id ? 'Save' : 'Create project'}`}</Button>
        </div>
      </form>
    </Form>
  );
}
