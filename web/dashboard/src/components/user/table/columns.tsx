'use client';

import { UserRoleSelect } from './user-role-select';
import { UsersDataTableRowActions } from '@/components/user/table/data-table-row-actions';

export const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <span className="font-semibold">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.getValue('email'),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <UserRoleSelect value={row.original.role} userId={row.original.id} />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <UsersDataTableRowActions user={row.original} />
      </div>
    ),
  },
];
