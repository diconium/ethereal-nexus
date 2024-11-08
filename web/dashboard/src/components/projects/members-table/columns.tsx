'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { MemberPermissionsSelect } from '@/components/projects/members-table/member-permissions-select';
import { MemberWithPublicUser } from '@/data/member/dto';
import { Badge } from '@/components/ui/badge';
import { MemberDataTableRowActions } from '@/components/projects/members-table/actions';

export const columns: ColumnDef<MemberWithPublicUser>[] = [
  {
    accessorKey: 'name',
    accessorFn: (row) => {
      return row.user.name;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.original.user.name}</div>,
    enableSorting: true
  },
  {
    accessorKey: 'email',
    accessorFn: (row) => {
      return row.user.email;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => <div>{row.original.user.email}</div>,
    enableSorting: true
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
    enableSorting: true
  },
  {
    accessorKey: 'permissions',
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Permissions" />
    ),
    cell: ({ row }) => <MemberPermissionsSelect member={row.original} resource={row.original.resource}/>,
    enableSorting: false
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end" >
        <MemberDataTableRowActions member={row.original} />
      </div>
    ),
  },
];
