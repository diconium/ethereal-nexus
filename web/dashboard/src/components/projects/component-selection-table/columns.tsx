'use client';

import * as React from 'react';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { ActiveSwitch } from '@/components/projects/component-selection-table/active-switch';
import { VersionPicker } from '@/components/projects/component-selection-table/version-picker';
import Link from 'next/link';
import { ProjectsComponentsRowActions } from '@/components/projects/component-selection-table/actions';
import { SSRSwitch } from '@/components/projects/component-selection-table/ssr-switch';

export const columns = [
	{
		id: 'name',
		accessorFn: (row) => row.name,
		header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
		cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue('name')}</Link>,
		enableSorting: true,
		enableHiding: true,
	},
	{
		id: 'title',
		accessorFn: (row) => row.title,
		header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
		cell: ({ row }) => <Link href={`/components/${row.original.id}`}>{row.getValue('title')}</Link>,
		enableSorting: true,
		enableHiding: true,
	},
	{
		id: 'version',
		accessorFn: (row) => row.version,
		header: ({ column }) => (
			<DataTableColumnHeader className="font-bold" column={column} title="Version" />
		),
		cell: ({ row, table }) => {
			const { id, version, versions } = row.original;
			const { environmentId, projectId, permissions } = table.options.meta;

			return (
				<VersionPicker
					disabled={permissions === 'read'}
					key={id}
					projectId={projectId}
					environmentId={environmentId}
					componentId={id}
					version={version}
					versions={versions}
				/>
			);
		},
		enableSorting: false,
		enableHiding: true,
	},
	{
		id: 'feature_flag_count',
		accessorFn: (row) => row.feature_flag_count,
		header: ({ column }) => (
			<DataTableColumnHeader className="font-bold" column={column} title="Feature Flags" />
		),
		cell: ({ row, table }) => {

      const { environmentId, projectId } = table.options.meta;

			const count = row.original.feature_flag_count;
			const componentId = row.original.id;

			if (count > 0) {
				return (
					<a
            className={"flex justify-center item-center h-full"}
						href={`/projects/${projectId}?tab=featureFlags&component=${componentId}&env=${environmentId}`}
					>
						<span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full hover:bg-orange-120 bg-orange-60 text-white">
							{count}
						</span>
					</a>
				);
			}
			return null;
		},
		enableSorting: true,
		enableHiding: true,
	},
	{
		id: 'active',
		accessorFn: (row) => row.is_active,
		header: ({ column }) => (
			<DataTableColumnHeader className="font-bold" column={column} title="Active" />
		),
		cell: ({ row, table }) => {
			const { id } = row.original;
			const { projectId, environmentId, permissions } = table.options.meta;

			return (
				<ActiveSwitch
					disabled={permissions === 'read'}
					key={id}
					projectId={projectId}
					environmentId={environmentId}
					componentId={id}
					active={row.getValue('active')}
				/>
			);
		},
		enableSorting: false,
		enableHiding: true,
	},
	{
		id: 'ssr_active',
		accessorFn: (row) => row.ssr_active,
		header: ({ column }) => (
			<DataTableColumnHeader className="font-bold" column={column} title="SSR" />
		),
		cell: ({ row, table }) => {
			const { id } = row.original;

			const { projectId, environmentId, permissions } = table.options.meta;

			return (
				<SSRSwitch
					disabled={permissions === 'read'}
					key={id}
					projectId={projectId}
					environmentId={environmentId}
					componentId={id}
					ssrActive={row.getValue('ssr_active')}
				/>
			);
		},
		enableSorting: false,
		enableHiding: true,
	},
	{
		id: 'actions',
		cell: ({ table, row }) => (
			<div className="flex justify-end">
				<ProjectsComponentsRowActions row={row} table={table} />
			</div>
		),
	},
];
