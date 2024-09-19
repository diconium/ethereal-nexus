'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { Dialog, DialogTrigger } from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Environment } from '@/data/projects/dto';
import { launch } from '@/data/launches/actions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export type LaunchButtonProps = {
  from: Pick<Environment, 'id' | 'name' | 'project_id'>,
  to: Pick<Environment, 'id' | 'name' | 'project_id'>,
}

export function LaunchButton({ from, to }: LaunchButtonProps) {
  const { data: session } = useSession();
  const { replace } = useRouter();

  const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);

  const handleLaunch = async () => {
    const result = await launch(from.id, to.id, session?.user?.id);
    if (!result.success) {
      toast({
        title: `Launch from ${from.name} to ${to.name} could not be completed.`
      });
    }

    toast({
      title: `Launch from ${from.name} to ${to.name} was successfull!.`
    });
    setIsLaunchDialogOpen(false);
    replace(`/projects/${to.project_id}?env=${to.id}`);
  };

  return <Dialog open={isLaunchDialogOpen} onOpenChange={setIsLaunchDialogOpen}>
    <DialogTrigger asChild>
      <Button
        size="base"
        variant="primary"
        className="ml-auto flex gap-2">
        <Rocket />
        <span>Confirm Launch</span>
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogDescription>
          You will now merge the configs from dev into main. Are you sure you want to continue?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => setIsLaunchDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleLaunch}
          className="flex gap-2">
          <Rocket />
          Launch!
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
