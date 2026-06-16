import { Separator } from '@/components/ui/separator';
import React from 'react';
import UserInviteForm from '@/components/user/user-invitation-form';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';

export default async function NewUser() {
  const session = await auth()
  if(session?.user?.role !== 'admin') {
    notFound();
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold">Invite User</h1>
        <p className="text-muted-foreground">Invite a new User</p>
      </div>
      <Separator />
      <UserInviteForm />
    </div>
  );
}
