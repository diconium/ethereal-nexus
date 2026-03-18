import { Separator } from '@/components/ui/separator';
import React from 'react';
import UserInviteForm from '@/components/user/user-invitation-form';

export default async function NewUser() {
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
