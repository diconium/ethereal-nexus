import React from 'react';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { upsertEnvironment } from '@/data/projects/actions';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { Environment } from '@/data/projects/dto';

type ActiveSwitchProps = {
  environment: Environment,
  active: boolean,
  disabled: boolean,
}

export function ActiveSwitch({ environment, active, disabled }: ActiveSwitchProps) {
  const router = useRouter();
  const form = useForm({ defaultValues: { is_active: active } });

  const onSubmit = async (data) => {
    const update = await upsertEnvironment({
        ...environment,
        secure: data.is_active
      });

    if (!update.success) {
      toast({
        title: 'Failed to activate component.'
      });
    }
    router.refresh()
  };

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
  </Form>;
}
