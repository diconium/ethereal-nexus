import { Separator } from "@/components/ui/separator";
import React from 'react';
import UserForm from '@/components/user/user-form';

export default async function NewUser({ params }: any) {
  return (
    <div className="container space-y-6">
      <div>
        <h3 className="text-lg font-medium">Projects</h3>
        <p className="text-sm text-muted-foreground">
          Create a new User
        </p>
      </div>
      <Separator />
      <UserForm />
    </div>
  );
}