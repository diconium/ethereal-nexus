'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Events from '@/components/components/component/version/tabs/events';
import { EventWithDiscriminatedUnions } from '@/data/events/dto';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

interface ProjectEventsClientProps {
  id: string;
  initialPageIndex?: number;
  initialPageSize?: number;
  initialUserId?: string;
  initialComponentId?: string;
  initialType?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialSortField?: string;
  initialSortDir?: string;
  initialGlobalFilter?: string;
  hideProjectColumn?: boolean;
  hideComponentColumn?: boolean;
}

const ProjectEventsClient: React.FC<ProjectEventsClientProps> = ({
  id,
  initialPageIndex = 0,
  initialPageSize = 10,
  initialUserId,
  initialComponentId,
  initialType,
  initialStartDate,
  initialEndDate,
  initialSortField,
  initialSortDir,
  initialGlobalFilter = '',
  hideProjectColumn = false,
  hideComponentColumn = false,
}) => {
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });
  const [userFilter, setUserFilter] = useState<string | undefined>(
    initialUserId,
  );
  const [componentFilter, setComponentFilter] = useState<string | undefined>(
    initialComponentId,
  );
  const [typeFilter, setTypeFilter] = useState<string | undefined>(initialType);
  const [startDate, setStartDate] = useState<string | undefined>(
    initialStartDate,
  );
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);
  const [sortField, setSortField] = useState<string | undefined>(
    initialSortField,
  );
  const [sortDir, setSortDir] = useState<string | undefined>(initialSortDir);
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
  const [filterOptionsCache, setFilterOptionsCache] = useState({
    users: [] as { id: string; name?: string; email?: string }[],
    components: [] as { id: string; name?: string; title?: string }[],
    types: [] as string[],
  });
  const { data: session } = useSession();

  const resetPage = React.useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const wrapWithPageReset = React.useCallback(
    <T extends (...args: any[]) => void>(handler: T) =>
      (...args: Parameters<T>) => {
        resetPage();
        handler(...args);
      },
    [resetPage],
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: [
      'events',
      id,
      pagination.pageIndex,
      pagination.pageSize,
      userFilter,
      componentFilter,
      typeFilter,
      startDate,
      endDate,
      sortField,
      sortDir,
      globalFilter,
    ],
    queryFn: async () => {
      const body = {
        resourceId: id,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        ...(userFilter ? { userId: userFilter } : {}),
        ...(componentFilter ? { componentId: componentFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(sortField ? { sortField } : {}),
        ...(sortDir ? { sortDir } : {}),
        ...(globalFilter ? { globalFilter } : {}),
      };
      const res = await fetch('/api/events/query', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      return data.data;
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (data?.filterOptions) {
      setFilterOptionsCache((prev) => ({
        users: data.filterOptions.users?.length
          ? data.filterOptions.users
          : prev.users,
        components: data.filterOptions.components?.length
          ? data.filterOptions.components
          : prev.components,
        types: data.filterOptions.types?.length
          ? data.filterOptions.types
          : prev.types,
      }));
    }
  }, [data?.filterOptions]);

  const filterOptions = useMemo(() => {
    return filterOptionsCache;
  }, [filterOptionsCache]);

  const handlePaginationChange = (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => {
    setPagination(pagination);
  };

  const handleGlobalFilterChange = wrapWithPageReset((value: string) => {
    setGlobalFilter(value);
  });

  const handleUserFilterChange = wrapWithPageReset((value?: string) => {
    setUserFilter(value);
  });

  const handleComponentFilterChange = wrapWithPageReset((value?: string) => {
    setComponentFilter(value);
  });

  const handleTypeFilterChange = wrapWithPageReset((value?: string) => {
    setTypeFilter(value);
  });

  const handleStartDateChange = wrapWithPageReset((value?: string) => {
    setStartDate(value);
  });

  const handleEndDateChange = wrapWithPageReset((value?: string) => {
    setEndDate(value);
  });

  const handleResetFilters = React.useCallback(() => {
    setGlobalFilter('');
    setUserFilter(undefined);
    setComponentFilter(undefined);
    setTypeFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    resetPage();
  }, [resetPage]);

  if (isError) {
    return (
      <div>
        Error loading events:{' '}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const eventList = Array.isArray(data?.data) ? data.data : [];
  const total = Number(data?.total) || 0;

  return (
    <Events
      events={eventList}
      resourceId={id}
      total={total}
      pageIndex={pagination.pageIndex}
      pageSize={pagination.pageSize}
      globalFilter={globalFilter}
      userId={userFilter}
      componentId={componentFilter}
      type={typeFilter}
      startDate={startDate}
      endDate={endDate}
      sortField={sortField}
      sortDir={sortDir}
      filterUsers={filterOptions.users || []}
      filterComponents={filterOptions.components || []}
      filterTypes={filterOptions.types || []}
      hideProjectColumn={hideProjectColumn}
      hideComponentColumn={hideComponentColumn}
      onGlobalFilterChange={handleGlobalFilterChange}
      onUserFilterChange={handleUserFilterChange}
      onComponentFilterChange={handleComponentFilterChange}
      onTypeFilterChange={handleTypeFilterChange}
      onStartDateChange={handleStartDateChange}
      onEndDateChange={handleEndDateChange}
      onResetFilters={handleResetFilters}
      onPaginationChange={handlePaginationChange}
      onSortingChange={({ sortField, sortDir }) => {
        setSortField(sortField);
        setSortDir(sortDir);
      }}
      loading={isLoading || isFetching}
    />
  );
};

export default ProjectEventsClient;
