import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { addComponentToProject } from '@/data/projects/actions';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';

type ActiveSwitchProps = {
  componentId: string,
  projectId: string,
  active: boolean,
}
export function ActiveSwitch({componentId, projectId, active}:ActiveSwitchProps) {
  const { data: session } = useSession()
  const form = useForm({defaultValues: {is_active: active}});

  const onSubmit = async (data) => {
    await addComponentToProject({project_id: projectId, component_id: componentId, is_active: data.is_active}, session?.user?.id)
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
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>)}
      />
    </form>
  </Form>
}
