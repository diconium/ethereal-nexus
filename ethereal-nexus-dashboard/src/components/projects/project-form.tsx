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

const projectsFormSchema = z.object({
  name: z.string().min(3, {
    message: "Name must be at least 3 characters.",
  }),
  description: z.string(),
  components: z.array(z.string()),
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
        <MultiSelect
          allOptions={availableComponents}
          label="Select components that can be used in this project"
          placeholder="Select components"
          notFoundLabel="No components found"
          addLabel="Add component"
          valueProp={"name"}
          viewValueProp={"name"}
          initialSelectedOptions={project?.components ?? []}
          onChange={(value) => {
            form.setValue("components", value);
          }}
        />
        <Button type="submit">Update project</Button>
      </form>
    </Form>
  );
}
