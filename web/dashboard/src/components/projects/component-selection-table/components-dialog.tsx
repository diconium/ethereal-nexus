'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React, { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CheckIcon } from '@radix-ui/react-icons';
import { upsertComponentConfig } from '@/data/projects/actions';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

type ComponentsDialogProps = {
  components: any,
  project: string,
  environment: string,
}

export function ComponentsDialog({ components, environment, project }: ComponentsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const { data: session } = useSession();
  const isDisabled = session?.permissions[project] !== 'write';

  if(!components.success) {
    throw new Error(components.error.message)
  }

  const handleSubmit = async () => {
    const updateResult = await Promise.all(
      selectedComponents.map( async (component) => (
        await upsertComponentConfig({environment_id: environment, component_id: component, is_active:true}, session?.user?.id, 'project_component_added')
      ))
    );

    if(updateResult.some((result) => !result.success)){
      toast({
        title: "Failed to add components.",
      });
    } else {
      toast({
        title: `Components added successfully!`,
      });
      setIsOpen(false);
      setSelectedComponents([]);
    }
  };

  return (
    <>
      <Button
        size="base"
        variant='primary'
        onClick={() => setIsOpen(true)}
        className="ml-auto flex"
        disabled={isDisabled}
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
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex flex-wrap flex-col justify-start gap-1 w-fit">
            <p className="text-sm text-muted-foreground text-center">
              { `Selected components: ${selectedComponents.length}`}
            </p>
            <Button
              disabled={selectedComponents.length < 1}
              onClick={handleSubmit}
              variant="primary"
              size="base"
              className="self-start"
            >
              Add components
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
