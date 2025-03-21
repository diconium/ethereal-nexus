'use client';

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const columns = [
  {
    id: 'name',
    accessorFn: row => row.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <span className={`flex gap-2${row.original.new ? ' text-green-400' : null}`}>{
      row.original.new ?
        <Badge variant={'success'}>New</Badge> :
        null
    }{row.getValue('name')}
    </span>,
    enableSorting: true,
    enableHiding: true
  },
  {
    id: 'title',
    accessorFn: row => row.title,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => <span
      className={`flex gap-2${row.original.new ? ' text-green-400' : null}`}>{row.getValue('title')}</span>,
    enableSorting: true,
    enableHiding: true
  },
  {
    id: 'version',
    accessorFn: row => row.version,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Version" />
    ),
    cell: ({ row }) => <div className="flex gap-2">
      {row.original.new ?
        <Badge variant={'success'}>{row.getValue('version').from}</Badge> :
        row.original.version.to === row.original.version.from ?
          <span className="text-muted-foreground">{row.original.version.from}</span> :
        <>
          <Badge
            variant={'destructive'}>{row.getValue('version').to}</Badge>
          <ArrowRight className="text-slate-300" size={20} />
          <Badge variant={'success'}>{row.getValue('version').from}</Badge>
        </>
      }
    </div>,
    enableSorting: false,
    enableHiding: true
  },
  {
    id: 'active',
    accessorFn: row => row.is_active,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Active" />
    ),
    cell:
      ({ row }) => <div className="flex gap-2">
        {row.original.new ?
          <Badge variant={'success'}>{row.getValue('active').from ? 'Active' : 'Inactive'}</Badge> :
          row.original.is_active.to === row.original.is_active.from ?
            <span className="text-muted-foreground">{row.original.is_active.to ? 'Active' : 'Inactive'}</span> :
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ShieldAlert className="text-slate-300" size={20} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Launch keeps the state on the target environment.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge variant="warning">{row.getValue('active').to ? 'Active' : 'Inactive'}</Badge>
            </>
        }
      </div>,
    enableSorting: false,
    enableHiding: true
  }
];


