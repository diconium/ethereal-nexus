"use client";

import {useForm} from "react-hook-form";
import * as z from "zod";
import {Button} from "@/components/ui/button";

import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {TextArea} from '@/components/ui/text-area';
import {zodResolver} from "@hookform/resolvers/zod";
import React from "react";
import { useToast } from '@/components/ui/use-toast';
import { Environment, EnvironmentInput, environmentInputSchema, ProjectInput } from '@/data/projects/dto';
import { upsertEnvironment, upsertProject } from '@/data/projects/actions';
import { useSession } from 'next-auth/react';
import { Switch } from '@/components/ui/switch';

type ProjectsFormProps = {
  project: string,
  environment?: Environment,
  onComplete?: () => void,
  onCancel?: () => void,
}

export default function EnvironmentsForm({project, environment, onComplete, onCancel}: ProjectsFormProps) {
  const {data: session} = useSession();
  const { toast } = useToast()
  const form: any = useForm<EnvironmentInput>({
    resolver: zodResolver(environmentInputSchema),
    defaultValues: {
      ...environment,
      project_id: environment?.project_id || project,
      secure: environment?.secure || false,
    },
  });
  const onSubmit = async (data: EnvironmentInput) => {
    const environments = await upsertEnvironment({
      ...data
    }, session?.user?.id);
    if(!environments.success) {
      return toast({
        title: `Failed to ${data.id ? "update" : "create"} environment "${data.name}"!`,
      });
    }

    toast({
      title: `Environment ${environments.data.id ? "update" : "create"}d successfully!`,
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
          render={({ field }) => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Name</FormLabel>
              <FormControl>
                <Input placeholder="Name" {...field} className="bg-white dark:bg-transparent font-bold" />
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
                <TextArea placeholder="Description" {...field} rows={5} className="bg-white dark:bg-transparent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="secure"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="transition-colors text-muted-foreground font-bold">Secure</FormLabel>
              <FormControl className="">
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
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
          <Button type="submit" variant="primary" size="base">{`${environment?.id ? "Save" : "Create Environment"}`}</Button>
        </div>
      </form>
    </Form>
  );
}
