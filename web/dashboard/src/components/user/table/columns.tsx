'use client';

import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { UserRoleSelect } from './user-role-select';
import { UsersDataTableRowActions } from '@/components/user/table/data-table-row-actions';

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <span className="font-semibold">{row.getValue("name")}</span>,
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
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end" >
        <UsersDataTableRowActions user={row.original} />
      </div>
    ),
  },
];