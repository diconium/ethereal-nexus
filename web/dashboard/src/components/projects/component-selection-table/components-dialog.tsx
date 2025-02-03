'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { MouseEventHandler, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon } from '@radix-ui/react-icons';
import { upsertComponentConfig } from '@/data/projects/actions';
import { useSession } from 'next-auth/react';
import { Check, ChevronDownIcon, ClipboardCopy, Plus, Rocket } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type Environment } from '@/data/projects/dto';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

type ComponentsDialogProps = {
  components: any,
  project: string,
  environment: string,
  environments: Environment[],
}

export function ComponentsDialog({ components, environment, project, environments }: ComponentsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEnvironmentOpen, setEnvironmentOpen] = useState(false);
  const [isLaunchOpen, setLaunchOpen] = useState(false);

  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[project] || '');

  const selected = environments.find(env => env.id === environment);
  if (!components.success) {
    throw new Error(components.error.message);
  }

  const handleSubmit = async () => {
    const updateResult = await Promise.all(
      selectedComponents.map(async (component) => (
        await upsertComponentConfig({
          environment_id: environment,
          component_id: component,
          is_active: true
        }, project, session?.user?.id, 'project_component_added')
      ))
    );

    if (updateResult.some((result) => !result.success)) {
      toast({
        title: 'Failed to add components.'
      });
    } else {
      toast({
        title: `Components added successfully!`
      });
      setIsOpen(false);
      setSelectedComponents([]);
    }
  };

  function handleEnvironment(environmentId: string | null) {
    return () => {
      const params = new URLSearchParams(searchParams.toString());
      if (environmentId) {
        params.set('env', environmentId);
      }
      replace(`${pathname}?${params.toString()}`);

      setEnvironmentOpen(false);
    };
  }

  function handleLaunch(environmentId: string | null) {
    return () => {
      const params = new URLSearchParams(searchParams.toString());
      if (environmentId) {
        params.set('env', environmentId);
      }
      replace(`/projects/launch/new/${environment}...${environmentId}`);

      setEnvironmentOpen(false);
    };
  }


  const copyProjectUrl: MouseEventHandler = () => {
    navigator.clipboard.writeText(
      window.location.origin +
      `/api/v1/environments/${environment}/components`
    ).then(() => {
      toast({
        title: 'Environment URL copied to clipboard'
      });
    });
  };


  return (
    <div className="flex justify-between">
      <div className="flex gap-2">
        <Popover open={isEnvironmentOpen} onOpenChange={setEnvironmentOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary" className="flex justify-between min-w-[125px]">
              {selected!.name}
              <ChevronDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandInput placeholder="Select environment..." />
              <CommandList>
                <CommandGroup>
                  {
                    environments
                      .map(env => (
                          <CommandItem
                            key={env.id}
                            value={env.name}
                            onSelect={handleEnvironment(env.id)}
                            className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                          >
                      <span
                        className="flex items-center">
                          {
                            environment === env.id ?
                              <Check className="mr-2 h-4 w-4 text-muted-foreground" /> :
                              null
                          }
                        <p>{env.name}</p>
                      </span>
                          </CommandItem>
                        )
                      )
                  }
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Popover open={isLaunchOpen} onOpenChange={setLaunchOpen}>
          <PopoverTrigger asChild>
            <Button
              disabled={!hasWritePermissions}
              size="sm"
            >
              <Rocket className="mr-2 h-4 w-4" />
              <span>Launch</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Command>
              <CommandInput placeholder="Select environment..." />
              <CommandList>
                <CommandGroup>
                  {environments
                    .filter(env => env.id !== environment)
                    .map(env => (
                        <CommandItem
                          key={env.id}
                          value={env.name}
                          onSelect={handleLaunch(env.id)}
                          className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                        >
                          <span className="flex items-center">
                            {environment === env.id ?
                              <Check className="mr-2 h-4 w-4 text-muted-foreground" /> :
                              null
                            }
                            <span>{selected?.name}...{env.name}</span>
                          </span>
                        </CommandItem>
                      )
                    )
                  }
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyProjectUrl}>
          <ClipboardCopy className="mr-2 h-4 w-4" />
          <span>Copy URL</span>
        </Button>
      </div>
      <Button
        size="base"
        onClick={() => setIsOpen(true)}
        disabled={!hasWritePermissions}
      >
        <Plus />
        Add components
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Components
            </DialogTitle>
            <DialogDescription>
              Add components to this project so they can be used.
            </DialogDescription>
          </DialogHeader>
          <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
            <CommandInput placeholder="Search components..." />
            <CommandList>
              <CommandEmpty>No components found.</CommandEmpty>
              <CommandGroup className="p-2">
                {components.data.map((component) => {
                  const componentId = component.id.toString();

                  return (
                    <CommandItem
                      key={component.id}
                      className="flex items-center px-2"
                      onSelect={() => {
                        if (selectedComponents.includes(componentId)) {
                          return setSelectedComponents(
                            selectedComponents.filter(
                              (selectedComp) => selectedComp !== componentId
                            )
                          );
                        }

                        return setSelectedComponents([...selectedComponents, componentId]);
                      }}
                    >
                      <div className="ml-2">
                        <p className="text-sm text-muted-foreground">
                          {component.title}
                        </p>
                      </div>
                      {selectedComponents.includes(componentId) ? (
                        <CheckIcon className="ml-auto flex h-5 w-5" />
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex flex-wrap flex-col justify-start gap-1 w-fit">
            <p className="text-sm text-muted-foreground text-center">
              {`Selected components: ${selectedComponents.length}`}
            </p>
            <Button
              disabled={selectedComponents.length < 1}
              onClick={handleSubmit}
              size="base"
              className="self-start"
            >
              Add components
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
