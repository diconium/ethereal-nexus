'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { userLoginSchema } from '@/data/users/dto';
import { PasswordInput } from '@/components/ui/password-input';
import { login } from '@/data/users/actions';
import { Github } from '@/components/ui/icons/Github';
import { Microsoft } from '@/components/ui/icons/Microsoft';
import { MagicWandIcon } from '@radix-ui/react-icons';

type UserFormProps = {
  onComplete?: () => void
  providers: ('credentials' | 'github' | 'microsoft-entra-id' | 'azure-communication-service' | false)[]
}

export default function LoginForm({ providers }: UserFormProps) {
  const credentialsForm = useForm({
    resolver: zodResolver(userLoginSchema)
  });

  const emailForm = useForm({
    resolver: zodResolver(userLoginSchema.pick({ email: true }))
  });

  async function credentialsHandler(formdata) {
    const result = await login('credentials', formdata);

    if (!result?.success) {
      switch (true) {
        case result?.error.message.includes('Email not verified.'):
          credentialsForm.setError('email', {
            type: 'manual',
            message: 'Email not verified. Please use the magic link options.'
          });
      }
    }
  }

  async function emailHandler(formdata) {
    await login('azure-communication-service', formdata);
  }

  return (
    <>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Login
        </h1>
      </div>
      {providers.includes('credentials') ?
        <>
          <Form {...credentialsForm}>
            <form onSubmit={credentialsForm.handleSubmit(credentialsHandler)} className="space-y-4">
              <FormField
                control={credentialsForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@yourcompany.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              <FormField
                control={credentialsForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="****" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              <Button className="w-full" type="submit">Login</Button>
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
        {providers.includes('azure-communication-service') ?
          <>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(emailHandler)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe@yourcompany.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  disabled={emailForm.formState.isSubmitting}
                  variant="outline"
                  className="w-full flex space-x-2 items-center justify-start"
                  type="submit"
                >
                  <MagicWandIcon className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
                  <span className="text-neutral-700 dark:text-neutral-300 text-sm">
                    Magic Link
                  </span>
                </Button>
              </form>
            </Form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
            </div>
          </> :
          null
        }

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
