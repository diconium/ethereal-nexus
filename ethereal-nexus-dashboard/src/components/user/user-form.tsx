"use client";

import {useForm} from "react-hook-form";
import * as z from "zod";
import {Button} from "@/components/ui/button";

import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {zodResolver} from "@hookform/resolvers/zod";
import React from "react";
import { NewUser, newUserSchema } from '@/data/users/dto';
import { insertInvitedUser, insertUser } from '@/data/users/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { PasswordInput } from '@/components/ui/password-input';

type UserFormProps = {
  onComplete?: () => void
}

export default function UserForm({ onComplete }: UserFormProps) {
  const searchParams = useSearchParams()
  const router = useRouter();
  const { toast } = useToast()

  const form = useForm<NewUser>({
    resolver: zodResolver(newUserSchema)
  });

  async function handler(formdata) {
    const user = await insertInvitedUser(formdata, searchParams.get('key'));
    if (user.success) {
      toast({
        title: 'User created successfully!',
      });
      if(onComplete) onComplete();
      return router.push("/api/auth/signin");
    }

    form.setError('email', {
      type: "manual",
      message: user.error.message,
    })
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
                <Input placeholder="John Doe" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                This is the name user.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="johndoe@yourcompany.com" {...field} />
              </FormControl>
              <FormDescription>
                This is the email of the user.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({field}) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="****" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Please select a password.
              </FormDescription>
              <FormMessage/>
            </FormItem>
          )}
        />
        <Button className='w-full' type="submit">Create user</Button>
      </form>
    </Form>
  );
}
