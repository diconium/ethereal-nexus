"use client";

import * as React from "react";
import {
    ColumnFiltersState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {DataTablePagination} from "@/components/ui/data-table/data-table-pagination";
import {DataTableToolbar} from "./data-table-toolbar";
import {useEffect, useState} from "react";
import {columns} from "@/components/projects/projects-data-table/columns";

export function ProjectsDataTable() {
    const [rowSelection, setRowSelection] = useState({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        [],
    );
    const [sorting] = useState([]);
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch("/api/v1/projects")
            .then((response) => response.json())
            .then((data) => {
                setData(data);
            });
    }, []);

    const table = useReactTable({
        data,
        columns,
        state: {
            data,
            setData,
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
        } as any,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
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
