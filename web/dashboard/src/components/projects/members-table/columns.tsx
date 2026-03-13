'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MemberPermissionsSelect } from '@/components/projects/members-table/member-permissions-select';
import { MemberWithPublicUser } from '@/data/member/dto';
import { Badge } from '@/components/ui/badge';
import { MemberDataTableRowActions } from '@/components/projects/members-table/actions';

export const columns: ColumnDef<MemberWithPublicUser>[] = [
  {
    accessorKey: 'name',
    accessorFn: (row) => row.user.name,
    header: 'Name',
    cell: ({ row }) => <div>{row.original.user.name}</div>,
  },
  {
    accessorKey: 'email',
    accessorFn: (row) => row.user.email,
    header: 'Email',
    cell: ({ row }) => <div>{row.original.user.email}</div>,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  },
  {
    accessorKey: 'permissions',
    header: 'Permissions',
    cell: ({ row }) => (
      <MemberPermissionsSelect
        member={row.original}
        resource={row.original.resource}
      />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <MemberDataTableRowActions member={row.original} />
      </div>
    ),
  },
];
