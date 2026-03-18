import React from 'react';
import EventsTable from '@/components/projects/project-events/events-table';
import { EventWithDiscriminatedUnions } from '@/data/events/dto';

interface EventProps {
  events: EventWithDiscriminatedUnions[];
  resourceId?: string;
  total: number;
  pageIndex: number;
  pageSize: number;
  globalFilter: string;
  userId?: string;
  componentId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortDir?: string;
  filterUsers: { id: string; name?: string; email?: string }[];
  filterComponents: { id: string; name?: string; title?: string }[];
  filterTypes: string[];
  hideProjectColumn?: boolean;
  hideComponentColumn?: boolean;
  onGlobalFilterChange: (v: string) => void;
  onUserFilterChange: (v: string | undefined) => void;
  onComponentFilterChange: (v: string | undefined) => void;
  onTypeFilterChange: (v: string | undefined) => void;
  onStartDateChange: (v: string | undefined) => void;
  onEndDateChange: (v: string | undefined) => void;
  onResetFilters: () => void;
  onSortingChange: (s: any) => void;
  onPaginationChange: (p: { pageIndex: number; pageSize: number }) => void;
  loading?: boolean;
}

const Events: React.FC<EventProps> = ({
  events = [],
  resourceId,
  total,
  pageIndex,
  pageSize,
  globalFilter,
  userId,
  componentId,
  type,
  startDate,
  endDate,
  sortField,
  sortDir,
  filterUsers = [],
  filterComponents = [],
  filterTypes = [],
  hideProjectColumn = false,
  hideComponentColumn = false,
  onGlobalFilterChange,
  onUserFilterChange,
  onComponentFilterChange,
  onTypeFilterChange,
  onStartDateChange,
  onEndDateChange,
  onResetFilters,
  onSortingChange,
  onPaginationChange,
  loading = false,
}) => {
  return (
    <div className="w-full">
      <EventsTable
        events={events}
        total={total}
        pageIndex={pageIndex}
        pageSize={pageSize}
        globalFilter={globalFilter}
        userFilter={userId}
        componentFilter={componentId}
        typeFilter={type}
        startDate={startDate}
        endDate={endDate}
        sorting={[]}
        filterUsers={filterUsers}
        filterComponents={filterComponents}
        filterTypes={filterTypes}
        hideProjectColumn={hideProjectColumn}
        hideComponentColumn={hideComponentColumn}
        onGlobalFilterChangeAction={onGlobalFilterChange}
        onUserFilterChangeAction={onUserFilterChange}
        onComponentFilterChangeAction={onComponentFilterChange}
        onTypeFilterChangeAction={onTypeFilterChange}
        onStartDateChangeAction={onStartDateChange}
        onEndDateChangeAction={onEndDateChange}
        onResetFiltersAction={onResetFilters}
        onSortingChangeAction={onSortingChange}
        onPaginationChangeAction={onPaginationChange}
        loading={loading}
      />
    </div>
  );
};

export default Events;
