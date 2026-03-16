'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerWithRangeProps = {
  date: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  description?: string;
  hideLabel?: boolean;
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
  inline?: boolean;
};

export function DatePickerWithRange({
  date,
  onChange,
  placeholder,
  label = 'Date range',
  className,
  triggerClassName,
  description,
  hideLabel = false,
  buttonVariant = 'outline',
  inline = false,
}: DatePickerWithRangeProps) {
  const triggerId = React.useId();
  const labelText = date?.from
    ? date.to
      ? `${format(date.from, 'LLL dd, y')} – ${format(date.to, 'LLL dd, y')}`
      : format(date.from, 'LLL dd, y')
    : (placeholder ?? 'Pick a date');

  const Wrapper = inline ? 'div' : Field;
  const LabelComponent = inline ? Label : FieldLabel;
  const descriptionNode = description ? (
    inline ? (
      <p className="text-sm text-muted-foreground">{description}</p>
    ) : (
      <FieldDescription>{description}</FieldDescription>
    )
  ) : null;

  return (
    <Wrapper
      className={cn('w-fit', inline && 'flex flex-col gap-2', className)}
    >
      {label ? (
        <LabelComponent
          htmlFor={triggerId}
          className={hideLabel ? 'sr-only' : undefined}
        >
          {label}
        </LabelComponent>
      ) : null}
      {descriptionNode}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant={buttonVariant}
            size="sm"
            className={cn(
              'h-8 justify-start px-2.5 font-normal min-w-[220px] border-dashed',
              !date && 'text-muted-foreground',
              triggerClassName,
            )}
          >
            <CalendarIcon data-icon="inline-start" />
            {labelText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from ?? date?.to}
            selected={date}
            onSelect={onChange}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </Wrapper>
  );
}
