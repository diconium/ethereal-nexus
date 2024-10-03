'use client';

import React, { useState } from 'react';
import { Check, ChevronDownIcon, Combine } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export function EnvironmentPicker({ from, to, environments }) {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  return <div className="flex items-center space-x-4 rounded-md border p-4 bg-accent">
    <Combine />
    <div className="flex items-center gap-5">
      <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="flex justify-between  gap-2 min-w-[125px]">
            <span>from</span>
            <Separator orientation="vertical" />
            <span>{from.name}</span>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Select environment..." />
            <CommandList>
              <CommandGroup>
                {environments
                  .map(env => (
                    <Link
                      key={env.id}
                      href={`/projects/launch/new/${env.id}...${to.id}`}>
                      <CommandItem
                        value={env.name}
                        className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                      >
                      <span
                        className="flex items-center">
                          {from.id === env.id ?
                              <Check className="mr-2 h-4 w-4 text-muted-foreground" /> :
                              null
                          }
                        <p>{env.name}</p>
                      </span>
                      </CommandItem>
                    </Link>
                    )
                  )
                }
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <span>...</span>
      <Popover open={isToOpen} onOpenChange={setIsToOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" className="flex justify-between gap-2 min-w-[125px]">
            <span>to</span>
            <Separator orientation="vertical" />
            <span>{to.name}</span>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Select environment..." />
            <CommandList>
              <CommandGroup>
                {environments
                  .map(env => (
                    <Link
                      key={env.id}
                      href={`/projects/launch/new/${from.id}...${env.id}`}>
                      <CommandItem
                        value={env.name}
                        className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                      >
                      <span
                        className="flex items-center">
                          {to.id === env.id ?
                            <Check className="mr-2 h-4 w-4 text-muted-foreground" /> :
                            null
                          }
                        <p>{env.name}</p>
                      </span>
                      </CommandItem>
                    </Link>
                    )
                  )
                }
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  </div>;
}