'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { insertUserApiKey } from '@/data/users/actions';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiKeyPermissions, apiKeyPermissionsSchema } from '@/data/users/dto';
import { useSession } from 'next-auth/react';

type ProjectLabels = {
  id: string,
  name: string,
}

type ApiKeyDialogProps = {
  userId?: string;
  availableProjects: ProjectLabels[]
}

const displayFormSchema = z.object({
  permissions: apiKeyPermissionsSchema.optional()
})

export function ApiKeyDialog({ userId, availableProjects }: ApiKeyDialogProps) {
  const { data: session } = useSession()
  console.log(session)
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [apiKey, setKey] = useState<string | null>(null);

  const form = useForm<z.infer<typeof displayFormSchema>>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      permissions: {
        ...session?.permissions as ApiKeyPermissions,
        components: 'read'
      }
    },
  })

  const handleSubmit = async (data) => {
    const key = await insertUserApiKey(data.permissions, userId);
    if (key.success) {
      setKey(key.data.id);
      toast({
        title: 'Api Key added successfully!'
      });
    } else {
      toast({
        title: 'Failed to add Api Key.',
        description: key.error.message
      });
    }
  };

  return (
    <>
      <Button
        variant={'outline'}
        size={'sm'}
        onClick={() => setOpen(true)}
        className="ml-auto hidden h-8 lg:flex mr-4">
        <PlusCircledIcon className="mr-2 h-4 w-4" />
        Create Key
      </Button>
      <Dialog open={open} onOpenChange={(state) => {
        setOpen(state);
        setKey(null);
        router.refresh()
      }}>
        <DialogContent className="gap-0 p-0 px-4 outline-none">
          <DialogHeader className="pb-4 pt-5">
            <DialogTitle>Create Key</DialogTitle>
            <DialogDescription>
              Create a new API Key for your user. The key will be displayed here, you should store it, as it will display
              obfuscated from now on.
            </DialogDescription>
          </DialogHeader>
          <Separator className="mb-4" />
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
        </DialogContent>
      </Dialog>
    </>
  );
}
