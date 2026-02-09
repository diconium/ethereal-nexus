'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {  Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FeatureFlagForm from '@/components/projects/feature-flags-table/feature-flag-form';
import { Environment } from '@/data/projects/dto';
import { Popover} from '@/components/ui/popover';
import { Component } from '@/data/components/dto';
import { SelectPopover } from '@/components/ui/select-popover';


type AddEnvironmentProps = {
  resource: string;
  environmentId: string,
  componentId?: string;
  environments?: Environment[];
  components?: Component[];
}

export function FeatureFlagDialog({ resource, environmentId, componentId, components = [], environments = [] }: AddEnvironmentProps) {
  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[resource] || '');

  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [isEnvironmentOpen, setEnvironmentOpen] = useState(false);
  const [isComponentOpen, setComponentOpen] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const selected = environments.find(env => env.id === environmentId);


  const selectedComponent = components.find(comp => comp.id === componentId);

  function handleChange(id: string | null, parameter, functionToClose: (open: boolean) => void) {

      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set(parameter, id);
      } else {
        params.delete(parameter);
      }
      replace(`${pathname}?${params.toString()}`);

     functionToClose(false);

  }

  return (
    <div className={"ml-2 w-full flex gap-2 justify-between"}>
      <Popover open={isEnvironmentOpen} onOpenChange={setEnvironmentOpen}>
        <SelectPopover
          label="Environment"
          items={environments}
          selected={selected}
          onSelect={(id) => handleChange(id, 'env', setEnvironmentOpen)}
          open={isEnvironmentOpen}
          setOpen={setEnvironmentOpen}
        />
      </Popover>
      <Popover open={isComponentOpen} onOpenChange={setComponentOpen}>
        <SelectPopover
          label="Component"
          items={components}
          selected={selectedComponent}
          onSelect={(id) => handleChange(id, 'component', setComponentOpen)}
          open={isComponentOpen}
          setOpen={setComponentOpen}
        />
      </Popover>
      <Button
        disabled={!hasWritePermissions}
        size="base"
        onClick={() => setOpen(true)}
        className="ml-auto flex">
        <Plus />
        Add Feature Flag
      </Button>
      <Dialog open={open} onOpenChange={router.back}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Feature Flags</DialogTitle>
            <DialogDescription>
              Create a new feature flag
            </DialogDescription>
          </DialogHeader>
          <FeatureFlagForm component={selectedComponent} environment={selected} components={components} environments={environments} project={resource} onComplete={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>);
}