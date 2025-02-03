"use client";

import { DataTableViewOptions } from './data-table-view-options';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Cross2Icon } from '@radix-ui/react-icons';

export function DataTableToolbar<TData>({ table, entityName, createSlot }) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div>
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder={`Filter ${entityName}...`}
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      { createSlot }
      <DataTableViewOptions table={table} />
    </div>
  );
}
