'use client';

import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { upsertApiKey } from '@/data/users/actions';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiKey, ApiKeyPermissions, NewApiKey, newApiKeySchema } from '@/data/users/dto';
import { useSession } from 'next-auth/react';
import { notFound } from 'next/navigation';
import { ShieldBan } from 'lucide-react';
import { isPermissionsHigher } from '@/data/users/permission-utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type ProjectLabels = {
  id: string, name: string,
}

type ApiKeyDialogProps = {
  apyKey?: Omit<ApiKey, 'member_permissions'>; availableProjects: ProjectLabels[]; onComplete?: () => void
}

export function ApiKeyForm({ apyKey, availableProjects, onComplete }: ApiKeyDialogProps) {
  const { data: session } = useSession();
  const [apiKey, setKey] = useState<string | null>(null);

  if (!session?.user?.id) {
    notFound();
  }

  const defaultValues = apyKey ?? {
    alias: '', user_id: session?.user?.id, permissions: {
      ...session?.permissions as ApiKeyPermissions, components: 'read'
    }
  };

  const form = useForm<NewApiKey>({
    resolver: zodResolver(newApiKeySchema), defaultValues
  });

  const handleSubmit = async (data) => {
    const key = await upsertApiKey({
      ...data
    });
    if (key.success) {
      setKey(key.data.key);
      toast({
        title: `Api Key ${apyKey?.id ? 'updated' : 'added'} successfully!`
      });
    } else {
      toast({
        title: `Failed to ${apyKey?.id ? 'update' : 'add'} API key!`, description: key.error.message
      });
    }

    if (onComplete) {
      onComplete();
    }
  };

  const apiKeyPermissions = form.watch('permissions');

  // Check if all permissions are not accessible
  const noAccessPermissions = apiKeyPermissions && Object.values(apiKeyPermissions).every(value => value === 'none') || undefined;

  return (<Form {...form}>
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="alias"
        render={({ field }) => (<FormItem>
          <FormLabel>Alias</FormLabel>
          <FormControl>
            <Input placeholder="Alias..." {...field} value={field.value ?? ''} />
          </FormControl>
          <FormDescription>This is the key public display name.</FormDescription>
          <FormMessage />
        </FormItem>)}
      />
      <Separator className="my-4" />
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
          return (<FormItem
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
                    ...field.value, components: value
                  });
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
          </FormItem>);
        }}
      />
      <Separator className="my-4" />
      <div className="mb-4">
        <FormLabel className="text-base">Projects</FormLabel>
        <FormDescription>
          Select the projects you want to give permissions in the API key.
          If you are an admin beware that only projects that you are a member of are selectable.
        </FormDescription>
      </div>
      <ScrollArea className="h-[200px] gap-y-3">
        {availableProjects.map((item) => (<FormField
          key={item.id}
          control={form.control}
          name={'permissions'}
          render={({ field }) => {
            const restricted = isPermissionsHigher(field.value?.[item.id], session?.permissions[item.id]);
            return (<FormItem
              key={item.id}
              className="flex flex-row items-center justify-between"
            >
              <FormLabel className="font-normal">
                {item.name}
              </FormLabel>
              <div className="flex gap-2">
                {restricted ? <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <ShieldBan
                        className="h-4 w-4" color="red" />
                      Restricted
                    </span> : null}
                <FormControl>
                  <Select
                    value={field.value?.[item.id]}
                    defaultValue={'read'}
                    onValueChange={value => {
                      field.onChange({
                        ...field.value, [item.id]: value
                      });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">No access</SelectItem>
                        <SelectItem value="read" disabled={session?.permissions[item.id] === 'none'}>
                          Can read
                        </SelectItem>
                        <SelectItem
                          value="write"
                          disabled={!['write', 'manage'].includes(session?.permissions[item.id] || '')}
                        >
                          Can edit
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>);
          }}
        />))}
      </ScrollArea>
      <FormMessage />
      {apiKey ? <>
        <Separator className="my-4" />
        <Input className="w-full" disabled value={apiKey} />
      </> : null}
      <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
        <Button
          disabled={!!apiKey || noAccessPermissions}
          type="submit"
        >
          Continue
        </Button>
      </DialogFooter>
    </form>
  </Form>);
}
