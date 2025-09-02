"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/text-area';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Environment, FeatureFlagInput, featureFlagInputSchema } from '@/data/projects/dto';
import { upsertFeatureFlag } from '@/data/projects/actions';
import { Component } from '@/data/components/dto';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from '@/components/ui/command';
import { ChevronDownIcon, Check } from 'lucide-react';
import { SelectPopover } from '@/components/ui/select-popover';


type FeatureFlagFormProps = {
  project: string,
  environments?: Environment[],
  component?: Component;
  environment?: Environment;
  components?: Component[];
  onComplete?: () => void,
  onCancel?: () => void,
}

export default function FeatureFlagForm({ environment, component, project, onComplete, onCancel, environments = [], components = [] }: FeatureFlagFormProps) {
  const { toast } = useToast();
  const form: any = useForm<FeatureFlagInput>({
    resolver: zodResolver(featureFlagInputSchema),
    defaultValues: {
      environment_id: environment?.id || environments[0]?.id,
      component_id: component?.id ,
      project_id: project,
      enabled: false,
    },
  });

  const onSubmit = async (data: FeatureFlagInput) => {



    const result = await upsertFeatureFlag({ ...data });
    if (!result.success) {
      return toast({
        title: `Failed to ${data.id ? "update" : "create"} feature flag "${data.flag_name}"!`,
      });
    }
    toast({
      title: `Feature flag ${result.data.id ? "update" : "create"}d successfully!`,
    });
    if (onComplete) {
      onComplete();
    }
  };

  const [isEnvironmentOpen, setEnvironmentOpen] = React.useState(false);
  const [isComponentOpen, setComponentOpen] = React.useState(false);
  const selectedEnv = environments.find(env => env.id === form.watch('environment_id')) || environments[0];
  const selectedComp = components.find(comp => comp.id === form.watch('component_id')) || components[0];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="flag_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Name</FormLabel>
              <FormControl>
                <Input placeholder="Feature Flag Name" {...field} className="bg-white dark:bg-transparent font-bold" />
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
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="transition-colors text-muted-foreground font-bold">Enabled</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="environment_id"
          render={() => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Environment</FormLabel>
              <SelectPopover
                label="Environment"
                items={environments}
                selected={selectedEnv}
                onSelect={id => form.setValue('environment_id', id)}
                open={isEnvironmentOpen}
                setOpen={setEnvironmentOpen}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="component_id"
          render={() => (
            <FormItem>
              <FormLabel className="transition-colors text-muted-foreground font-bold">Component</FormLabel>
              <SelectPopover
                label="Component"
                items={components}
                selected={selectedComp}
                onSelect={id => {
                  console.log(id);
                  form.setValue('component_id', id)
                }}
                open={isComponentOpen}
                setOpen={setComponentOpen}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-14">
          {onCancel && (
            <Button onClick={onCancel} variant="text" className="text-orange-500 font-bold text-base p-0">
              Cancel
            </Button>
          )}
          <Button type="submit" size="base">Create Feature Flag</Button>
        </div>
      </form>
    </Form>
  );
}
