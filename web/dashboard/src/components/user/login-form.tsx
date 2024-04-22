"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { NewUser, userLoginSchema } from '@/data/users/dto';
import { PasswordInput } from '@/components/ui/password-input';
import { login } from '@/data/users/actions';
import { Github } from '@/components/ui/icons/Github';
import { Microsoft } from '@/components/ui/icons/Microsoft';

type UserFormProps = {
  onComplete?: () => void
  providers:  ('github' | 'azure-ad')[]
}

export default function LoginForm({ onComplete, providers }: UserFormProps) {
  const form = useForm<NewUser>({
    resolver: zodResolver(userLoginSchema)
  });

  async function handler(formdata) {
    await login('credentials', formdata)
  }

  return (
    <>
      <Form {...form}>
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Login
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
          <FormField
            control={form.control}
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="****" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className='w-full' type="submit">Login</Button>
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
          disabled={!providers.includes('azure-ad')}
          variant="outline"
          className="flex space-x-2 items-center justify-start"
          type="submit"
          onClick={() => login('azure-ad')}
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
