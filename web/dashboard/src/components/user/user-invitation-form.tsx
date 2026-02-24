"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useState } from 'react';
import { NewInvite, newInviteSchema } from '@/data/users/dto';
import { insertInvite } from '@/data/users/actions';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import { useCopyToClipboard } from '@/components/hooks/useCopyToClipboard';

type UserInviteFormProps = {
  onComplete?: () => void
}

export default function UserInviteForm({ onComplete }: UserInviteFormProps) {
  const { toast } = useToast()
  const [inviteKey, setKey] = useState<string | null>(null);
  const [copiedText, copy] = useCopyToClipboard()

  const inviteUrl = typeof window !== 'undefined' ? `${window?.location.protocol}//${window.location.host}/auth/signup?key=${inviteKey}` : ''

  const form: any = useForm<NewInvite>({
    resolver: zodResolver(newInviteSchema as any)
  });

  async function handler(formdata) {
    const invite = await insertInvite(formdata);
    if (invite.success) {
      setKey(invite.data.key);
      toast({
        title: 'User invite created successfully!',
      });
      if(onComplete) onComplete();
    } else {
      toast({
        title: 'Failed to create invite.',
        description: invite.error.message,
      });
    }
  }

  const handleCopy = useCallback(async () => {
    await copy(inviteUrl)
    toast({
      title: 'Copied!',
    });
  }, [inviteUrl, copy, toast])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handler)} className="space-y-4">
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
        <FormMessage />
        {
          inviteKey ?
            <>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Input className="w-full" disabled value={inviteUrl} />
                <Button variant="secondary" type="button" onClick={handleCopy}>
                  {
                    copiedText ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />
                  }
                </Button>
              </div>
            </>
            : null
        }
        <Button className='w-full' type="submit">Create Invite</Button>
      </form>
    </Form>
  );
}
