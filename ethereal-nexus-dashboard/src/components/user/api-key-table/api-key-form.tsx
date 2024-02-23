'use client';

import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { upsertApiKey } from '@/data/users/actions';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiKey, ApiKeyPermissions, apiKeyPermissionsSchema, NewApiKey, newApiKeySchema } from '@/data/users/dto';
import { useSession } from 'next-auth/react';
import { notFound } from 'next/navigation';

type ProjectLabels = {
  id: string,
  name: string,
}

type ApiKeyDialogProps = {
  apyKey?: ApiKey;
  availableProjects: ProjectLabels[];
  onComplete?: () => void
}

export function ApiKeyForm({ apyKey, availableProjects, onComplete }: ApiKeyDialogProps) {
  const { data: session } = useSession()
  const [apiKey, setKey] = useState<string | null>(null);

  if(!session?.user?.id) {
    notFound()
  }

  const defaultValues = apyKey ?? {
    user_id: session?.user?.id,
    permissions:  {
        ...session?.permissions as ApiKeyPermissions,
        components: 'read'
      }
    };

  const form = useForm<NewApiKey>({
    resolver: zodResolver(newApiKeySchema),
    defaultValues,
  })

  const handleSubmit = async (data) => {
    const key = await upsertApiKey({
      ...data,
    });
    if (key.success) {
      setKey(key.data.key);
      toast({
        title: 'Api Key added successfully!'
      });
    } else {
      toast({
        title: 'Failed to add Api Key.',
        description: key.error.message
      });
    }

    if(onComplete) {
      onComplete()
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="mb-4">
          <FormLabel className="text-base">Entities</FormLabel>
          <FormDescription>
            Select the the entities permissions for the API key.
          </FormDescription>
        </div>
        <FormField
          control={form.control}
          name={'permissions'}
          render={({ field }) => {
            return (
              <FormItem
                key={'components-permissions'}
                className="flex flex-row items-center justify-between space-x-3 space-y-0 "
              >
                <FormLabel className="font-normal">
                  Components
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value?.['components']}
                    onValueChange={value => {
                      field.onChange({
                        ...field.value,
                        components: value,
                      })
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">No access</SelectItem>
                        <SelectItem value="read">Can read</SelectItem>
                        <SelectItem value="write">Can edit</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )
          }}
        />
        <Separator className="my-4" />
        <div className="mb-4">
          <FormLabel className="text-base">Projects</FormLabel>
          <FormDescription>
            Select the projects you want to give permissions in the API key.
          </FormDescription>
        </div>
        {availableProjects.map((item, index) => (
          <FormField
            key={item.id}
            control={form.control}
            name={'permissions'}
            render={({ field }) => {
              return (
                <FormItem
                  key={item.id}
                  className="flex flex-row items-center justify-between space-x-3 space-y-0 "
                >
                  <FormLabel className="font-normal">
                    {item.name}
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value?.[item.id]}
                      defaultValue={session?.permissions[item.id] ?? 'read'}
                      onValueChange={value => {
                        field.onChange({
                          ...field.value,
                          [item.id]: value
                        })
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">No access</SelectItem>
                          <SelectItem value="read">Can read</SelectItem>
                          <SelectItem value="write">Can edit</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )
            }}
          />
        ))}
        <FormMessage />
        {
          apiKey ?
            <>
              <Separator className="my-4" />
              <Input className="w-full" disabled value={apiKey} />
            </>
            : null
        }
        <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
          <Button
            disabled={!!apiKey}
            type="submit"
          >
            Continue
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
