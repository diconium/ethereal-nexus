import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDownIcon } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { componentVersionsSchema } from '@/data/components/dto';
import { z } from 'zod';
import { upsertComponentConfig } from '@/data/projects/actions';
import { useRouter } from 'next/navigation';

const versions = componentVersionsSchema.pick({id: true, version: true})

type VersionPickerProps = {
  projectId: string,
  componentId: string,
  version?: string,
  versions: z.infer<typeof versions>[]
}
export function VersionPicker({version: selected, versions, projectId, componentId}: VersionPickerProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  function handler(version) {
    return async () => {
      await upsertComponentConfig({
        project_id: projectId,
        component_id: componentId,
        component_version: version.id,
        is_active: true
      }, session?.user?.id);
      setOpen(false);
      router.refresh()
    };
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" className="flex justify-between min-w-[125px]">
        {selected ?? 'latest'}
        <ChevronDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="p-0" align="end">
      <Command>
        <CommandInput placeholder="Select version..." />
        <CommandList>
          <CommandEmpty>No versions found.</CommandEmpty>
          <CommandGroup>
            {
              versions.map(version => (
                <CommandItem
                  key={version.id}
                  value={version.version}
                  onSelect={handler(version)
                }
                  className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                >
                  <span
                    className="flex items-center">
                  {selected === version.version ? <Check className="mr-2 h-4 w-4 text-muted-foreground" /> : null}
                    <p>{version.version}</p>
                  </span>
                </CommandItem>))
            }
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
}
