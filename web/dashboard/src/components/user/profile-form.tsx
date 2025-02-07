"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { PublicUser, userPublicSchema } from '@/data/users/dto';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { updateUser } from '@/data/users/actions';

type ProfileFormProps = {
  name: PublicUser['name'];
  email: PublicUser['email'];
  onComplete?: () => void;
}

export default function ProfileForm({ name, email, onComplete }: ProfileFormProps) {
  const { data: session } = useSession()
  const router = useRouter();
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(
      userPublicSchema
        .pick({name: true, email: true})
    ),
    defaultValues: {
      name: name ?? '',
      email: email ?? '',
    }
  });

  async function handler(formdata) {
    const user = await updateUser({
      ...formdata,
      id: session?.user?.id,
    });
    if (user.success) {
      toast({
        title: 'User updated successfully!',
      });
      if(onComplete) onComplete();
      return router.refresh()
    }
  }

  return (
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
          <Button disabled={!form.formState.isDirty} type="submit">Update profile</Button>
        </form>
      </Form>
  );
}
