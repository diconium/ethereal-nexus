'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import EnvironmentsForm from '@/components/projects/environments-form';

type AddEnvironmentProps = {
  resource: string;
}

export function EnvironmentDialog({ resource }: AddEnvironmentProps) {
  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[resource] || '');

  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        disabled={!hasWritePermissions}
        size="base"
        variant="primary"
        onClick={() => setOpen(true)}
        className="ml-auto flex">
        <Plus />
        Add Environment
      </Button>
      <Dialog open={open} onOpenChange={router.back}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Environments</DialogTitle>
            <DialogDescription>
              Create a new Environment
            </DialogDescription>
          </DialogHeader>
          <EnvironmentsForm project={resource} onComplete={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}