'use client';

import { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTableFacetedFilter } from '@/components/ui/data-table/data-table-faceted-filter';

interface DataTableToolbarFacet {
  columnId: string;
  title: string;
  options: Array<{
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
    count?: number;
  }>;
  multi?: boolean;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  entityName?: string;
  createSlot?: React.ReactNode;
  filterColumn?: string;
  facets?: DataTableToolbarFacet[];
  searchPlaceholder?: string;
}

export function DataTableToolbar<TData>({
  table,
  entityName,
  createSlot,
  filterColumn,
  facets = [],
  searchPlaceholder,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        {filterColumn ? (
          <Input
            placeholder={
              searchPlaceholder ?? `Filter ${entityName ?? 'items'}...`
            }
            value={
              (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(filterColumn)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : null}
        {facets.map(({ columnId, title, options, multi = true }) => {
          const column = table.getColumn(columnId);
          if (!column) return null;
          const columnValue = column.getFilterValue();
          const selectedValues = Array.isArray(columnValue)
            ? columnValue
            : columnValue
              ? [columnValue]
              : [];
          return (
            <DataTableFacetedFilter
              key={columnId}
              title={title}
              options={options}
              selectedValues={selectedValues as string[]}
              onChange={(values) => {
                if (!multi) {
                  column.setFilterValue(values[0] ?? undefined);
                  return;
                }
                column.setFilterValue(values.length ? values : undefined);
              }}
            />
          );
        })}
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
