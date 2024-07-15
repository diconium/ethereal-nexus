import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { upsertComponentConfig } from '@/data/projects/actions';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

type ActiveSwitchProps = {
  componentId: string,
  disabled: boolean,
  projectId: string,
  active: boolean,
}
export function ActiveSwitch({componentId, disabled, projectId, active}:ActiveSwitchProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const form = useForm({defaultValues: {is_active: active}});

  const onSubmit = async (data) => {
    const update = await upsertComponentConfig(
      {project_id: projectId, component_id: componentId, is_active: data.is_active}, session?.user?.id, data.is_active ? 'project_component_activated' : 'project_component_deactivated')
    if(!update.success){
      toast({
        title: "Failed to activate component.",
      });
    }
  }

  return <Form {...form}>
    <form onChange={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="is_active"
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
