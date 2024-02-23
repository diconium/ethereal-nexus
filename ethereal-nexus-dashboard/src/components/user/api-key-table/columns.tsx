'use client'

import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Badge } from "@/components/ui/badge"

export const columns = [
  {
    id: "select",
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
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Key" />
    ),
    cell: ({ row }) => row.getValue("id"),
    enableSorting: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created Date" />
    ),
    cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return date.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    enableSorting: true,
  },
  {
    accessorKey: "project_permissions",
    accessorFn: (row) => row.project_name.map( ((project, index) => (<Badge variant={row.project_permissions[index] == "write" ? "destructive" : ""}>{project + " : " + row.project_permissions[index]}</Badge> ))),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Projects" />
    ),
    cell: ({row}) => row.getValue("project_permissions"),
    enableSorting: true,
  },
  {
    accessorKey: "permissions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Components" />
    ),
      cell: ({row}) => <Badge
          variant={row.getValue("permissions")?.components == "write" ? "destructive" : ""}>{row.getValue("permissions")?.components}</Badge>,
    enableSorting: true,
  },
];
//{"components":"read","1a2f3d6e-225e-487d-8d0f-c2e5af2b6357":"read"}
