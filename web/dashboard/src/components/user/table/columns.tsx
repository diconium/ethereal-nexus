'use client';

import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { UserRoleSelect } from './user-role-select';

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => row.getValue("name"),
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => row.getValue("email"),
    enableSorting: true,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader className="font-bold" column={column} title="Role" />
    ),
    cell: ({ row }) => <UserRoleSelect value={row.original.role} userId={row.original.id} />,
    enableSorting: false
  },
];