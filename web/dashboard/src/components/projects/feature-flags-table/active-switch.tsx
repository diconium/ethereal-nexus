import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { upsertFeatureFlag } from '@/data/projects/actions';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';

type ActiveSwitchProps = {
  componentId: string,
  disabled: boolean,
  projectId: string,
  environmentId: string,
  enabled: boolean,
  flagName: string,
}
export function ActiveSwitch({componentId, disabled, projectId, environmentId, enabled, flagId, flagName}:ActiveSwitchProps & { flagId: string }) {

  const form = useForm({defaultValues: {enabled: enabled}});

  const onSubmit = async (data) => {
    const update = await upsertFeatureFlag({
      id: flagId,
      flag_name: flagName,
      project_id: projectId,
      environment_id: environmentId,
      component_id: componentId,
      enabled: data.enabled
    });
    if(!update.success){
      toast({
        title: "Failed to update feature flag.",
      });
    }
  }

  return <Form {...form}>
    <form onChange={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="enabled"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Switch
                disabled={disabled}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>)}
      />
    </form>
  </Form>
}
