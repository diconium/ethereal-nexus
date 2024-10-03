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
import {compare} from 'semver';

const versions = componentVersionsSchema.pick({id: true, version: true})

type VersionPickerProps = {
  projectId: string,
  environmentId: string,
  componentId: string,
  disabled: boolean,
  version?: string,
  versions: z.infer<typeof versions>[]
}
export function VersionPicker({version: selected, disabled, versions, environmentId, projectId, componentId}: VersionPickerProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  function handler(versionId: string | null) {
    return async () => {
      await upsertComponentConfig({
        environment_id: environmentId,
        component_id: componentId,
        component_version: versionId,
        is_active: true
      }, projectId, session?.user?.id,'project_component_version_updated');
      setOpen(false);
      router.refresh()
    };
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button disabled={disabled} variant="outline" className="flex justify-between min-w-[125px]">
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
            <CommandItem
              key={'latest'}
              value={'latest'}
              onSelect={handler(null)
              }
              className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
            >
              <span
                className="flex items-center">
                {selected === null ? <Check className="mr-2 h-4 w-4 text-muted-foreground" /> : null}
                <p>latest</p>
              </span>
            </CommandItem>
            {
              versions.sort((a, b) => compare(a.version, b.version)).map(version => (
                <CommandItem
                  key={version.id}
                  value={version.version}
                  onSelect={handler(version.id)
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
