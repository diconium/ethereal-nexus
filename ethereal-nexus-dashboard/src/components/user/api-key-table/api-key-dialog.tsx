'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { apiKeyPermissionsSchema } from '@/data/users/dto';
import { ApiKeyForm } from '@/components/user/api-key-table/api-key-form';

type ProjectLabels = {
  id: string,
  name: string,
}

type ApiKeyDialogProps = {
  userId?: string;
  availableProjects: ProjectLabels[]
}

const displayFormSchema = z.object({
  permissions: apiKeyPermissionsSchema.optional()
})

export function ApiKeyDialog({ userId, availableProjects }: ApiKeyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={'outline'}
        size={'sm'}
        onClick={() => setOpen(true)}
        className="ml-auto hidden h-8 lg:flex mr-4">
        <PlusCircledIcon className="mr-2 h-4 w-4" />
        Create Key
      </Button>
      <Dialog open={open} onOpenChange={(state) => {
        setOpen(state);
        router.refresh()
      }}>
        <DialogContent className="gap-0 p-0 px-4 outline-none">
          <DialogHeader className="pb-4 pt-5">
            <DialogTitle>Create Key</DialogTitle>
            <DialogDescription>
              Create a new API Key for your user. The key will be displayed here, you should store it, as it will display
              obfuscated from now on.
            </DialogDescription>
          </DialogHeader>
          <Separator className="mb-4" />
          <ApiKeyForm availableProjects={availableProjects}/>
        </DialogContent>
      </Dialog>
    </>
  );
}
