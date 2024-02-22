"use client";

import {useForm} from "react-hook-form";
import * as z from "zod";
import {Button} from "@/components/ui/button";

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {zodResolver} from "@hookform/resolvers/zod";
import {useRouter} from "next/navigation";
import React from "react";
import { useToast } from '@/components/ui/use-toast';
import { ProjectInput } from '@/data/projects/dto';
import { upsertProject } from '@/data/projects/actions';
import { useSession } from 'next-auth/react';

const projectsFormSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters.",
  }),
  description: z.string(),
});

type ProjectsFormProps = {
  project?: ProjectInput
  onComplete?: () => void
}

export default function ProjectsForm({project, onComplete}: ProjectsFormProps) {
  const {data: session} = useSession();
  const { toast } = useToast()
  const form: any = useForm<ProjectInput>({
    resolver: zodResolver(projectsFormSchema),
    defaultValues: project ?? {},
  });
  const onSubmit = async (data: ProjectInput) => {
    const project = await upsertProject(data, session?.user?.id);

    if(!project.success) {
      toast({
        title: `Failed to ${data.id ? "update" : "create"} project "${data.name}"!`,
      });
    }

    toast({
      title: "Project created/updated sucessfully!",
    });

    if(onComplete) {
      onComplete()
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({field}) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name of the project or component library.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({field}) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Description" {...field} />
              </FormControl>
              <FormDescription>
                Add a small description that explains the scope of the project.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <Button type="submit">{`${project?.id ? "Update" : "Create"} project`}</Button>
      </form>
    </Form>
  );
}
