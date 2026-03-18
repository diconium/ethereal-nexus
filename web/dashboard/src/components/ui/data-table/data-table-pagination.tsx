import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DataTablePagination({ table }) {
  const pagination = table.getState().pagination;
  const pageCount = table.getPageCount();
  const canPreviousPage = table.getCanPreviousPage();
  const canNextPage = table.getCanNextPage();
  const onPaginationChange = table.options.onPaginationChange;

  // Helper to update pagination via parent handler
  const setPageIndex = (pageIndex) => {
    onPaginationChange?.({ pageIndex, pageSize: pagination.pageSize });
  };

  return (
    <div className="flex items-center justify-end px-4">
      <div className="flex items-center gap-8">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pagination.pageSize}`}
            onValueChange={(value) => {
              onPaginationChange?.({ pageIndex: 0, pageSize: Number(value) });
            }}
          >
            <SelectTrigger className="h-8 w-20" id="rows-per-page">
              <SelectValue placeholder={pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pagination.pageIndex + 1} of{' '}
          {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => setPageIndex(0)}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPageIndex(Math.max(0, pagination.pageIndex - 1))}
            disabled={!canPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => setPageIndex(Math.min(pageCount - 1, pagination.pageIndex + 1))}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => setPageIndex(pageCount - 1)}
            disabled={!canNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
