'use client';

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTablePagination } from '@/components/ui/data-table/data-table-pagination';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

type EventItem = any;

type EventsTableProps = {
  events: EventItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
  globalFilter: string;
  userFilter: string | undefined;
  componentFilter: string | undefined;
  typeFilter: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  sorting: any;
  filterUsers: { id: string; name?: string; email?: string }[];
  filterComponents: { id: string; name?: string; title?: string }[];
  filterTypes: string[];
  onGlobalFilterChangeAction: (v: string) => void;
  onUserFilterChangeAction: (v: string | undefined) => void;
  onComponentFilterChangeAction: (v: string | undefined) => void;
  onTypeFilterChangeAction: (v: string | undefined) => void;
  onStartDateChangeAction: (v: string | undefined) => void;
  onEndDateChangeAction: (v: string | undefined) => void;
  onResetFiltersAction: () => void;
  onSortingChangeAction: (s: any) => void;
  onPaginationChangeAction: (p: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  loading: boolean;
};

export default function EventsTable({
  events,
  total,
  pageIndex,
  pageSize,
  globalFilter,
  userFilter,
  componentFilter,
  typeFilter,
  startDate,
  endDate,
  sorting,
  filterUsers,
  filterComponents,
  filterTypes,
  onGlobalFilterChangeAction,
  onUserFilterChangeAction,
  onComponentFilterChangeAction,
  onTypeFilterChangeAction,
  onStartDateChangeAction,
  onEndDateChangeAction,
  onResetFiltersAction,
  onSortingChangeAction,
  onPaginationChangeAction,
  loading,
}: EventsTableProps) {
  const [debouncedSearch, setDebouncedSearch] = React.useState(globalFilter);

  React.useEffect(() => {
    if (globalFilter !== debouncedSearch) {
      setDebouncedSearch(globalFilter);
    }
  }, [globalFilter]);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if (debouncedSearch !== globalFilter) {
        onGlobalFilterChangeAction(debouncedSearch);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [debouncedSearch, globalFilter, onGlobalFilterChangeAction]);
  // Use filterUsers, filterComponents, filterTypes for dropdowns
  const users = filterUsers;
  const components = filterComponents;
  const types = filterTypes;

  const columns = React.useMemo<ColumnDef<EventItem, any>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => row.toggleExpanded()}
            className="p-0"
          >
            {row.getIsExpanded() ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        ),
      },
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ getValue }) => new Date(getValue()).toLocaleString(),
      },
      {
        accessorKey: 'type',
        id: 'types', // Ensure the column ID matches the expected 'types'
        header: 'Event',
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) =>
          row.original.user?.name ?? row.original.user?.email ?? 'Unknown',
      },
      {
        id: 'component',
        header: 'Component',
        cell: ({ row }) =>
          row.original.data?.component?.name ??
          row.original.data?.component?.title ??
          '-',
      },
      {
        id: 'project',
        header: 'Project',
        cell: ({ row }) => row.original.data?.project?.name ?? '-',
      },
    ],
    [],
  );

  const pageCount = pageSize ? Math.ceil((total || 0) / pageSize) : 0;
  const paginationState = React.useMemo(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );

  const handlePaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next =
        typeof updater === 'function' ? updater(paginationState) : updater;
      onPaginationChangeAction(next);
    },
    [onPaginationChangeAction, paginationState],
  );

  const table = useReactTable({
    data: events,
    columns,
    pageCount,
    manualPagination: true,
    state: { sorting, pagination: paginationState },
    onSortingChange: onSortingChangeAction,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const formattedTypes = types.map((type) => ({ label: type, value: type }));
  const formattedComponents = components.map((component) => ({
    label: component.name ?? component.title ?? '-',
    value: component.id,
  }));

  const handleUserFilterChange = React.useCallback(
    (value: string | undefined) => {
      const normalizedValue = value && value !== 'all' ? value : undefined;
      onUserFilterChangeAction(normalizedValue);
    },
    [onUserFilterChangeAction],
  );

  const handleResetFilters = () => {
    onGlobalFilterChangeAction('');
    onUserFilterChangeAction(undefined);
    onComponentFilterChangeAction(undefined);
    onTypeFilterChangeAction(undefined);
    onStartDateChangeAction(undefined);
    onEndDateChangeAction(undefined);
    onResetFiltersAction();
    table.getColumn('types')?.setFilterValue(undefined);
    table.getColumn('component')?.setFilterValue(undefined);
    table.getColumn('user')?.setFilterValue(undefined);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <Input
            placeholder="Search events..."
            value={debouncedSearch}
            onChange={(e) => setDebouncedSearch(e.target.value)}
            className="h-8 w-50"
          />

          <DataTableFacetedFilter
            column={table.getColumn('types')}
            title="Activity Type"
            options={formattedTypes}
            value={typeFilter ?? 'all'}
            onValueChange={(v) =>
              onTypeFilterChangeAction(v === 'all' ? undefined : v)
            }
          />
          <DataTableFacetedFilter
            column={table.getColumn('component')}
            title="Component"
            options={formattedComponents}
            value={componentFilter ?? 'all'}
            onValueChange={(v) =>
              onComponentFilterChangeAction(v === 'all' ? undefined : v)
            }
          />
          <DataTableFacetedFilter
            column={table.getColumn('user')}
            title="User"
            options={users.map((user) => ({
              label: user.name ?? user.email ?? 'Unknown',
              value: user.id,
            }))}
            value={userFilter ?? 'all'}
            onValueChange={handleUserFilterChange}
          />
          <DatePickerWithRange
            date={{
              from: startDate ? parseISO(startDate) : undefined,
              to: endDate ? parseISO(endDate) : undefined,
            }}
            onChange={(range) => {
              onStartDateChangeAction(
                range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
              );
              onEndDateChangeAction(
                range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
              );
            }}
            placeholder="Select date range"
            hideLabel
            className="w-auto"
            triggerClassName="min-w-[220px]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className={
              !globalFilter &&
              !userFilter &&
              !componentFilter &&
              !typeFilter &&
              !startDate &&
              !endDate
                ? 'hidden'
                : ''
            }
          >
            Reset
            <X className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg border">
        {loading ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted/50">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : null}
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort?.() ? (
                          <div className="ml-2 inline-flex"></div>
                        ) : null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() ? (
                    <TableRow>
                      <TableCell
                        colSpan={row.getVisibleCells().length}
                        className="bg-muted/50"
                      >
                        <div className="p-4">
                          <div className="text-sm font-medium">Details</div>
                          <pre className="mt-2 text-xs overflow-auto max-h-60 whitespace-pre-wrap">
                            {JSON.stringify(row.original, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table as any} />
    </div>
  );
}
