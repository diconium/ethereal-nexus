"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { UpdatePassword, updatePasswordSchema } from '@/data/users/dto';
import { useToast } from '@/components/ui/use-toast';
import { PasswordInput } from '@/components/ui/password-input';
import { logout, updateUserPassword } from '@/data/users/actions';
import { useSession } from 'next-auth/react';

type PasswordFormProps = {
  onComplete?: () => void;
}

export default function PasswordForm({ onComplete }: PasswordFormProps) {
  const {data: session} = useSession()
  const { toast } = useToast()

  const form = useForm<UpdatePassword>({
    resolver: zodResolver(updatePasswordSchema.omit({id: true}) as any)
  });

  async function handler(formdata) {
    const user = await updateUserPassword({
      id: session?.user?.id,
      ...formdata,
    });
    if (user.success) {
      toast({
        title: 'User password updated successfully!',
      });
      if(onComplete) onComplete();
      await logout()
    }
  }

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
          <FormField
            control={form.control}
            name="oldPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="****" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormDescription>
                  Please input your current password.
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
                <FormLabel>New Password</FormLabel>
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
          <Button disabled={!form.formState.isDirty} type="submit">Update password</Button>
        </form>
      </Form>
  );
}
