'use client'

import React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import UserInviteForm from '@/components/user/user-invitation-form';

export default function NewUserModal() {
  const router = useRouter();

  return <Dialog open={true} onOpenChange={router.back}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Create a new user
        </DialogDescription>
      </DialogHeader>
      <UserInviteForm />
    </DialogContent>
  </Dialog>
}
