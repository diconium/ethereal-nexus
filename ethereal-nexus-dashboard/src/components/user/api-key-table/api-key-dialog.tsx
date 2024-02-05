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
import { type MouseEventHandler, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { insertUserApiKey } from '@/data/users/actions';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Checkbox } from '@/components/ui/checkbox';

type ProjectLabels = {
  id: string,
  name: string,
}

type ApiKeyDialogProps = {
  userId?: string;
  availableProjects: ProjectLabels[]
}

const displayFormSchema = z.object({
  resources: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
})

const defaultValues = {
  resources: []
}

export function ApiKeyDialog({ userId, availableProjects }: ApiKeyDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [apiKey, setKey] = useState<string | null>(null);

  const form = useForm<z.infer<typeof displayFormSchema>>({
    resolver: zodResolver(displayFormSchema),
    defaultValues,
  })

  const handleSubmit = async (data) => {
    const key = await insertUserApiKey(data.resources, userId);
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
          <Separator className="my-2" />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="resources"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Project</FormLabel>
                      <FormDescription>
                        Select the projects you want to give permissions in the api key.
                      </FormDescription>
                    </div>
                    {availableProjects.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="resources"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.id
                                        )
                                      )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />
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