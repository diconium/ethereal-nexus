'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type MouseEventHandler, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { insertUserApiKey } from '@/data/users/actions';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

type ApiKeyDialogProps = {
  userId?: string;
}

export function ApiKeyDialog({ userId }: ApiKeyDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [apiKey, setKey] = useState<string | null>(null);

  const handleSubmit: MouseEventHandler = async () => {
    const key = await insertUserApiKey(userId);
    if (key.success) {
      setKey(key.data.id);
      toast({
        title: 'Api Key added successfully!'
      });
    } else {
      toast({
        title: 'Failed to add Api Key.',
        description: key.error.message
      });
    }
  };

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
        setKey(null);
        router.refresh()
      }}>
        <DialogContent className="gap-0 p-0 outline-none">
          <DialogHeader className="px-4 pb-4 pt-5">
            <DialogTitle>Create Key</DialogTitle>
            <DialogDescription>
              Create a new API Key for your ser. The key will be displayed here, you should store it, as it will display
              obfuscated from now on.
            </DialogDescription>
          </DialogHeader>
          {
            apiKey ?
              <Input className="w-auto m-5" disabled value={apiKey} />
              : null}
          <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
            <Button
              disabled={!!apiKey}
              onClick={handleSubmit}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}