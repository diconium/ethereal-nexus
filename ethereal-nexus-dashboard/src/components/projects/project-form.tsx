"use client";

import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import MultiSelect from "@/components/ui/multi-select";
import {ComponentsDataTable} from "@/components/components/components-data-table/data-table";
import {columns} from "@/components/components/components-data-table/projectColumns";
import React from "react";

const projectsFormSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters.",
  }),
  description: z.string(),
  components: z.array(z.object({
      name: z.string(),
      version: z.string(),
  })),
});

type ProjectsFormValues = z.infer<typeof projectsFormSchema>;

export default function ProjectsForm({ id, project, availableComponents }) {
  const router = useRouter();
  const form: any = useForm<ProjectsFormValues>({
    resolver: zodResolver(projectsFormSchema),
    defaultValues: project,
  });
  const onSubmit = async (data: ProjectsFormValues) => {
    try {
        console.log('submitting');
        console.log(data);
      await fetch(`/api/v1/projects${id !== "0" ? `/${id}` : ""}`, {
        method: "put",
        body: JSON.stringify(data),
      });
      toast({
        title: "Project created/updated sucessfully!",
      });
      router.push("/projects");
    } catch (error) {
      toast({
        title: `Failed to ${id ? "update" : "create"} project "${data.name}"!`,
      });
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} />
              </FormControl>
              <FormDescription>
                This is the name of the project or component library.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Description" {...field} />
              </FormControl>
              <FormDescription>
                Add a small description that explains the scope of the project.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
          <ComponentsDataTable columns={columns} dataUrl="/api/v1/componentsWithVersions" onChangeSelected={(value)=>form.setValue("components", value)} initialProjectComponents={project?.components}/>
          <Button type="submit">Update project</Button>
      </form>
    </Form>
  );
}
