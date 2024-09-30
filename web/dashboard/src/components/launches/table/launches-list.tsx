import { DataTable } from '@/components/ui/data-table/data-table';
import { columns } from './columns';
import React from 'react';
import { Component } from '@/data/components/dto';
import { LaunchButton, LaunchButtonProps } from '@/components/launches/table/launch-button';

export type ComparisonResult = Pick<Component, 'id' | 'name'  | 'title'> & {
  new: boolean;
  is_active: {
    from: boolean | null;
    to: boolean | null;
  };
  version: {
    from: string | null;
    to: string | null;
  };
};

type LaunchesListProps = {
  comparison: ComparisonResult[];
} & LaunchButtonProps

export async function LaunchesList({comparison, ...launchProps}: LaunchesListProps) {
  return <DataTable
    columns={columns}
    data={comparison}
    entity={'components'}
    createSlot={
      <LaunchButton {...launchProps} />
    }
  />;
}
