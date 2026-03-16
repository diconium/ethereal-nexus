'use client';

import * as React from 'react';
import { Check, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

type FacetOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  description?: string | null;
};

interface DataTableFacetedFilterProps {
  title: string;
  options: FacetOption[];
  selectedValues?: string[];
  onChange?: (values: string[]) => void;
  placeholder?: string;
  multi?: boolean;
  disabled?: boolean; // Added optional disabled prop
  mode?: string; // Added optional mode prop
}

export function DataTableFacetedFilter({
  title,
  options,
  selectedValues = [],
  onChange,
  placeholder,
  multi = true,
  disabled = false, // Default to false
  mode, // Added mode prop
}: DataTableFacetedFilterProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => new Set(selectedValues.filter(Boolean)),
    [selectedValues],
  );

  const setValues = (next: string[]) => {
    if (!disabled) {
      onChange?.(next);
    }
  };

  const toggleValue = (value: string) => {
    if (disabled) return; // Prevent toggling if disabled
    if (!multi) {
      if (selected.has(value)) {
        setValues([]);
      } else {
        setValues([value]);
      }
      return;
    }
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setValues(Array.from(next));
  };

  const clearValues = () => {
    if (!disabled) {
      setValues([]);
      setOpen(false);
    }
  };

  const activeCount = selected.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-dashed"
          disabled={disabled} // Disable button if disabled
        >
          <PlusCircle className="size-4" />
          <span className="hidden lg:inline">{title}</span>
          {activeCount > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {activeCount}
              </Badge>
              <div className="hidden gap-1 lg:flex">
                {activeCount > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {activeCount} selected
                  </Badge>
                ) : (
                  Array.from(selected).map((value) => {
                    const option = options.find((item) => item.value === value);
                    if (!option) return null;
                    return (
                      <Badge
                        key={value}
                        variant="secondary"
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder ?? `Filter ${title.toLowerCase()}...`}
            disabled={disabled} // Disable input if disabled
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleValue(option.value)}
                    className="gap-2"
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-[4px] border',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input [&_svg]:invisible',
                      )}
                    >
                      <Check className="size-3.5" />
                    </div>
                    {option.icon ? (
                      <option.icon className="size-4 text-muted-foreground" />
                    ) : null}
                    <div className="flex flex-1 flex-col text-sm">
                      <span>{option.label}</span>
                      {option.description ? (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </div>
                    {typeof option.count === 'number' ? (
                      <span className="text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {activeCount > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={clearValues}
                    className="justify-center text-sm"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
