import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { upsertComponentConfig } from '@/data/projects/actions';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

type SSRSwitchProps = {
  componentId: string,
  disabled: boolean,
  projectId: string,
  environmentId: string,
  ssrActive: boolean,
}

type SSRFormData = {
  ssr_active: boolean;
};


export function SSRSwitch({componentId, disabled, projectId, environmentId, ssrActive}:SSRSwitchProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const form = useForm<SSRFormData>({defaultValues: {ssr_active: ssrActive}});

  const onSubmit = async (data) => {
    const update = await upsertComponentConfig(
      {environment_id: environmentId, component_id: componentId, ssr_active: data.ssr_active}, projectId, session?.user?.id, data.is_active ? 'project_component_activated' : 'project_component_deactivated')
    if(!update.success){
      toast({
        title: "Failed to disable SSR on component.",
      });
    }
  }

  return <Form {...form}>
    <form onChange={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="ssr_active"
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
