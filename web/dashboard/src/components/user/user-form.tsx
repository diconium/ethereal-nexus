'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { NewUser, newUserSchema } from '@/data/users/dto';
import { insertInvitedCredentialsUser, login } from '@/data/users/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { PasswordInput } from '@/components/ui/password-input';
import { Github } from '@/components/ui/icons/Github';
import { Microsoft } from '@/components/ui/icons/Microsoft';

type UserFormProps = {
  onComplete?: () => void;
  providers: ('credentials' | 'github' | 'microsoft-entra-id' | 'azure-communication-service' | false)[]
}

export default function UserForm({ onComplete, providers }: UserFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(newUserSchema),
  });

  async function handler(formdata) {
    const user = await insertInvitedCredentialsUser(formdata, searchParams.get('key'));
    if (user.success) {
      toast({
        title: 'User created successfully!'
      });
      if (onComplete) onComplete();
      return router.push('/auth/signin');
    }

    form.setError('email', {
      type: 'manual',
      message: user.error.message
    });
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an account
        </h1>
      </div>
      {providers.includes('credentials') ?
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      This is the name user.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@yourcompany.com" {...field} type="email" />
                    </FormControl>
                    <FormDescription>
                      This is the email of the user.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="****" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Please select a password.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit">Create user</Button>
            </form>
          </Form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
            </div>
          </div>
        </> :
        null
      }
      <div className="flex flex-col space-y-4">
        <Button
          disabled={!providers.includes('github')}
          variant="outline"
          className="flex space-x-2 items-center justify-start"
          type="submit"
          onClick={() => login('github')}
        >
          <Github className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
          <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              GitHub
        </span>
        </Button>
        <Button
          disabled={!providers.includes('microsoft-entra-id')}
          variant="outline"
          className="flex space-x-2 items-center justify-start"
          type="submit"
          onClick={() => login('microsoft-entra-id')}
        >
          <Microsoft className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
          <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              Microsoft
        </span>
        </Button>
      </div>
    </>
  );
}
