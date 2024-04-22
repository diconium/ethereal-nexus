"use client";

import { DataTableViewOptions } from './data-table-view-options';

export function DataTableToolbar<TData>({ table, entityName, createSlot, isShowViewOpt }) {
  return (
    <>
      { createSlot }
      <DataTableViewOptions table={table} isShowViewOpt={isShowViewOpt} />
    </>
  );
}
