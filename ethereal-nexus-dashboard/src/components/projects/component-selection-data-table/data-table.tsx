"use client";

import * as React from "react";
import {useEffect, useState} from "react";
import {columns} from "./columns";

import {
    ColumnFiltersState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from "@tanstack/react-table";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";

import {DataTablePagination} from "./data-table-pagination";
import {DataTableToolbar} from "./data-table-toolbar";
import {ComponentWithVersions} from "@/app/api/v1/componentsWithVersions/model";

const convertToRowSelection = (data, projectComponents): Record<number, boolean> =>
    data.reduce((newRowSelection: Record<number, boolean>, component) => projectComponents.find(projectComponent => projectComponent.name === component.name) ? {
        ...newRowSelection,
        [component.name]: true
    } : newRowSelection, {})

const convertToProjectComponents = (projectComponents, rowSelection): { name: string, version: string }[] =>
    Object.keys(rowSelection).map(name => ({
        name,
        version: projectComponents.find(component => component.name === name)?.version || 'latest'
    }));


export function ComponentSelectionDataTable({
                                                onChangeSelected,
                                                initialProjectComponents = [],
                                            }) {
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        [],
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [data, setData] = useState([]);
    const [projectComponents, setProjectComponents] = useState(initialProjectComponents);
    const [rowSelection, setRowSelection] = useState(convertToRowSelection(data, projectComponents));
    useEffect(() => {
        fetch("/api/v1/componentsWithVersions")
            .then((response) => response.json())
            .then((data) => {
                setData(data);
                setRowSelection(convertToRowSelection(data, projectComponents));
            });
    }, []);

    const table: any = useReactTable({
        data,
        columns,
        state: {
            data,
            setData,
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            projectComponents,
            setProjectComponents: (newProjectComponents) => {
                onChangeSelected(newProjectComponents); // TODO avoid this duplication
                setProjectComponents(newProjectComponents as any);
            }
        } as any,
        enableRowSelection: true,
        onRowSelectionChange: (selectionUpdater) => {
            setRowSelection(selectionUpdater);

            const newRowSelection = typeof selectionUpdater === 'function' ? selectionUpdater(rowSelection) : selectionUpdater;
            const newProjectComponents = convertToProjectComponents(projectComponents, newRowSelection);
            onChangeSelected(newProjectComponents);
            setProjectComponents(newProjectComponents as any);
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getRowId: (originalRow: ComponentWithVersions) => originalRow.name // TODO this should be only for project cmps, not all (name is repeated in there)
    });

    return (
        <div className="space-y-4">
            <DataTableToolbar table={table}/>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext(),
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    highlightSelected={false}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table}/>
        </div>
    );
}
