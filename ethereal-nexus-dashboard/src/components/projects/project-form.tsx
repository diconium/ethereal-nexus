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

const projectsFormSchema = z.object({
    name: z.string().min(3, {
        message: "Name must be at least 3 characters.",
    }),
    description: z.string(),
});

type ProjectsFormValues = z.infer<typeof projectsFormSchema>;

export default function ProjectsForm({id, project}) {
    const router = useRouter();
    const { toast } = useToast()
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
                <Button type="submit">Update project</Button>
            </form>
        </Form>
    );
}
