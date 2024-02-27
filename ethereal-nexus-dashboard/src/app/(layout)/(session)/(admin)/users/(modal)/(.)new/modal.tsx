'use client'

import React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserForm from '@/components/user/user-form';
import { useRouter } from 'next/navigation';

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
      <UserForm onComplete={router.back}/>
    </DialogContent>
  </Dialog>
}
