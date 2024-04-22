'use client'

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Switch } from '@/components/ui/switch';
import { ActiveSwitch } from '@/components/projects/component-selection-table/active-switch';
import { Checkbox } from '@/components/ui/checkbox';
import { VersionPicker } from '@/components/projects/component-selection-table/version-picker';
import Link from "next/link";

export const columns = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        key={row.original.id}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    id: 'name',
    accessorFn: row => row.name,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue("name")}</Link>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "title",
    accessorFn: row => row.title,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue("title")}</Link>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "version",
    accessorFn: row => row.version,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Version" />
    ),
    cell: ({ row, table }) => {
      const {id, version, versions} = row.original;
      const {projectId, permissions} = table.options.meta;

      return <VersionPicker
        disabled={permissions !== 'write'}
        key={id}
        projectId={projectId}
        componentId={id}
        version={version}
        versions={versions}
      />
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    id: "active",
    accessorFn: row => row.is_active,
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Active" />
    ),
    cell: ({ row, table }) => {
      const {id} = row.original;
      const {projectId, permissions} = table.options.meta;

      return <ActiveSwitch
        disabled={permissions !== 'write'}
        key={id}
        projectId={projectId}
        componentId={id}
        active={row.getValue("active")}
      />
    },
    enableSorting: false,
    enableHiding: true,
  },
];
