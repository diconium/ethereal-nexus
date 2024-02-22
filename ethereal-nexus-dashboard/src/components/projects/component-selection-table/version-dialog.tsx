import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { Command, CommandItem, CommandList } from '@/components/ui/command';

interface VersionDialogProps {
  versions: string[];
  selectedVersion: string;
  onChangeVersion: (newVersion: string) => void;
}

export function VersionDialog({
                                versions: versionsWithoutLatest = [],
                                onChangeVersion,
                                selectedVersion = 'latest',
                              }: VersionDialogProps) {
  const versions = ['latest', ...versionsWithoutLatest];
  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='secondary'
            role='combobox'
            aria-expanded={open}
            aria-label='Select a team'
            className={cn('w-[200px] justify-between')}
          >
            {selectedVersion}
            <CaretSortIcon className='ml-auto h-4 w-4 shrink-0 opacity-50'/>
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[200px] p-0'>
          <Command>
            <CommandList>
              {versions.map((version) => (
                <CommandItem
                  key={version}
                  onSelect={() => {
                    onChangeVersion(version);
                    setOpen(false);
                  }}
                  className='text-sm'
                >
                  {version}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedVersion === version
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Dialog>
  );
}