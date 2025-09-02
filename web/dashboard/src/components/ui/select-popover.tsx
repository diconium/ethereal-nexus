import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronDownIcon } from 'lucide-react';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import React from 'react';

export function SelectPopover({ label, items, selected, onSelect, open, setOpen }: {
  label: string,
  items: { id: string, name: string }[],
  selected?: { id: string, name: string },
  onSelect: (id: string) => void,
  open: boolean,
  setOpen: (open: boolean) => void,
}) {

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="flex justify-between min-w-[125px]">
          {selected?.name}
          <ChevronDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder={`Select ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandGroup>
              { items.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                onSelect={() => { onSelect(item.id); setOpen(false); }}
                  className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                >
                  <span className="flex items-center">
                    {selected?.id === item.id ? <Check className="mr-2 h-4 w-4 text-muted-foreground" /> : null}
                    <p>{item.name}</p>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}