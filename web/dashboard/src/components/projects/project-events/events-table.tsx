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
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { EVENT_LABELS } from '@/lib/utils';

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
  hideProjectColumn?: boolean;
  hideComponentColumn?: boolean;
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
  filterUsers = [],
  filterComponents = [],
  filterTypes = [],
  hideProjectColumn = false,
  hideComponentColumn = false,
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
        cell: ({ getValue }) => {
          const type = getValue() as string;
          return EVENT_LABELS[type] ?? type;
        },
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) =>
          row.original.user?.name ?? row.original.user?.email ?? 'Unknown',
      },
      ...(!hideComponentColumn
        ? [
            {
              id: 'component',
              header: 'Component',
              cell: ({ row }: { row: { original: EventItem } }) =>
                row.original.data?.component?.name ??
                row.original.data?.component?.title ??
                '-',
            },
          ]
        : []),
      ...(!hideProjectColumn
        ? [
            {
              id: 'project',
              header: 'Project',
              cell: ({ row }: { row: { original: EventItem } }) =>
                row.original.data?.project?.name ?? '-',
            },
          ]
        : []),
    ],
    [hideProjectColumn, hideComponentColumn],
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

  const formattedTypes = types.map((type) => ({
    label: EVENT_LABELS[type] ?? type,
    value: type,
  }));
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
                        className="bg-muted/30"
                      >
                        <EventDetailsPanel event={row.original} />
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

const formatEventType = (value?: string) =>
  value
    ? value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Event';

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : '—';

const DetailField = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) => (
  <div className={`space-y-1 rounded-lg border bg-card/40 p-3 ${className}`}>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-semibold text-foreground break-words">
      {value ?? '—'}
    </p>
  </div>
);

const EventDetailsPanel = ({ event }: { event: EventItem }) => {
  const [showPayload, setShowPayload] = React.useState(false);
  const componentInfo = event.data?.component;
  const versionInfo = event.data?.version;
  const projectInfo = event.data?.project;
  const userInfo = event.user;

  const metadata = [
    { label: 'Resource ID', value: event.resource_id },
    { label: 'Event ID', value: event.id },
    { label: 'User ID', value: event.user_id },
  ];

  return (
    <div className="space-y-4 py-4">
      <Card className="border-muted">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs uppercase">
              {event.type ?? 'event'}
            </Badge>
            {componentInfo?.name ? (
              <Badge variant="outline">{componentInfo.name}</Badge>
            ) : null}
            {versionInfo?.version ? (
              <Badge variant="outline">v{versionInfo.version}</Badge>
            ) : null}
          </div>
          <CardTitle>{formatEventType(event.type)}</CardTitle>
          <CardDescription>{formatDateTime(event.timestamp)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailField
              label="Triggered By"
              value={userInfo?.name ?? userInfo?.email ?? 'Unknown user'}
            />
            <DetailField label="User Role" value={userInfo?.role} />
            <DetailField label="Project" value={projectInfo?.name} />
            <DetailField
              label="Component"
              value={componentInfo?.title ?? componentInfo?.name}
            />
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-3">
            {metadata.map(({ label, value }) => (
              <DetailField key={label} label={label} value={value} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle>Payload</CardTitle>
            <CardDescription>Full event object for debugging</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPayload((prev) => !prev)}
          >
            {showPayload ? 'Hide JSON' : 'Show JSON'}
          </Button>
        </CardHeader>
        {showPayload ? (
          <CardContent>
            <ScrollArea className="max-h-72 rounded-md border bg-muted/40">
              <pre className="whitespace-pre-wrap break-words p-3 text-xs">
                {JSON.stringify(event, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
};
