'use client'

import React from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import UserInviteForm from '@/components/user/user-invitation-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OauthUserForm from '@/components/user/oauth-user-form';

export default function NewUserModal() {
  const router = useRouter();

  return <Dialog open={true} onOpenChange={router.back}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create User</DialogTitle>
        <DialogDescription>
          Create a new user
        </DialogDescription>
      </DialogHeader>
      <Tabs>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email User</TabsTrigger>
          <TabsTrigger value="oauth">Service User</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <UserInviteForm />
        </TabsContent>
        <TabsContent value="oauth">
          <OauthUserForm />
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
}
