import { Separator } from "@/components/ui/separator";
import React from 'react';
import UserInviteForm from '@/components/user/user-invitation-form';

export default async function NewUser() {
  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Invites</h3>
        <p className="text-sm text-muted-foreground">
          Invite a new User
        </p>
      </div>
      <Separator />
      <UserInviteForm />
    </div>
  );
}