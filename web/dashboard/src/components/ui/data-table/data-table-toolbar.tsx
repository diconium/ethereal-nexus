'use client';

import { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  entityName?: string;
  createSlot?: React.ReactNode;
  filterColumn?: string;
}

export function DataTableToolbar<TData>({
  table,
  entityName,
  createSlot,
  filterColumn,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        {filterColumn ? (
          <Input
            placeholder={`Filter ${entityName}...`}
            value={
              (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(filterColumn)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : null}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">{createSlot}</div>
    </div>
  );
}
