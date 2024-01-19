import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

export const columns = [
  {
    accessorKey: 'component_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div className="w-[80px]">{row.getValue('component_id')}</div>,
    enableSorting: true,
    enableHiding: true
  },
  // {
  //   accessorKey: 'version',
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Version" />
  //   ),
  //   cell: ({ table, row }) => (
  //     <div className="h-9 w-[80px]">
  //       {row.getIsSelected() &&
  //         <VersionDialog
  //           versions={row.original.versions} // TODO check the proper way to do this
  //           selectedVersion={table.getState().projectComponents.find(component => component.name === row.getValue('name'))?.version}
  //           onChangeVersion={(newVersion) => table.getState().setProjectComponents([...table.getState().projectComponents.filter(component => component.name != row.getValue('name')), {
  //             name: row.getValue('name'),
  //             version: newVersion
  //           }])} />}
  //     </div>
  //   ),
  //   enableSorting: false,
  //   enableHiding: true
  // },
  // {
  //   id: 'active',
  //   header:
  //     ({ column }: any) => (
  //       <DataTableColumnHeader column={column} title="Active" />
  //     ),
  //   cell:
  //     ({ row }) => (
  //       <Switch
  //         checked={row.getIsSelected()}
  //         onCheckedChange={(value) => row.toggleSelected(value)} />
  //     ),
  //   enableSorting: false,
  //   enableHiding: false
  // }
];
