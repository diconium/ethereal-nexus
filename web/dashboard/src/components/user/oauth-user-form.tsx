"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { type NewServiceUserSchema, newServiceUserSchema } from '@/data/users/dto';
import { insertServiceUser } from '@/data/users/actions';
import { useToast } from '@/components/ui/use-toast';

type UserInviteFormProps = {
  onComplete?: () => void
}

export default function OauthUserForm({ onComplete }: UserInviteFormProps) {
  const { toast } = useToast()

  const form: any = useForm<NewServiceUserSchema>({
    resolver: zodResolver(newServiceUserSchema as any),
    defaultValues: {
      name: '',
      issuer: '',
      subject: '',
      client_id: '',
      client_secret: '',
    }
  });

  async function handler(formdata) {
    const serviceUser = await insertServiceUser(formdata);
    if (serviceUser.success) {
      toast({
        title: 'Service user created successfully!',
      });
      if(onComplete) onComplete();
    } else {
      toast({
        title: 'Failed to create service user.',
        description: serviceUser.error.message,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({field}) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Name of the client" {...field} />
              </FormControl>
              <FormDescription>
                Name to identify the service user.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="issuer"
          render={({field}) => (
            <FormItem>
              <FormLabel>Issuer</FormLabel>
              <FormControl>
                <Input placeholder="https://oauth.server.com/.well-known/openid-configuration" {...field} />
              </FormControl>
              <FormDescription>
                Issuer of the OAuth service.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({field}) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Subject of the client" {...field} />
              </FormControl>
              <FormDescription>
                Sub claim for the users JWT.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="client_id"
          render={({field}) => (
            <FormItem>
              <FormLabel>Client ID</FormLabel>
              <FormControl>
                <Input placeholder="client_id" {...field} />
              </FormControl>
              <FormDescription>
                Client ID provided by the OAuth server.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="client_secret"
          render={({field}) => (
            <FormItem>
              <FormLabel>Client Secret</FormLabel>
              <FormControl>
                <Input placeholder="client_secret" {...field} />
              </FormControl>
              <FormDescription>
                Client Secret provided by the OAuth server.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormMessage />
        <Button
          className='w-full'
          type="submit"
          disabled={form.formState.isSubmitting}>
          Create User
        </Button>
      </form>
    </Form>
  );
}
