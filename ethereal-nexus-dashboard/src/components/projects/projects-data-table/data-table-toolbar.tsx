"use client";

import { Cross2Icon, PlusCircledIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options";
import { useRouter } from "next/navigation";
import {Project} from "@/app/api/v1/projects/model";

export function DataTableToolbar({ table }) {
  const router = useRouter();

  const isFiltered = table.getState().columnFilters.length > 0;

  const onCreateNewProject = () => {
    router.push(`/projects/0`);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter projects..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions<Project> table={table} />
      <Button className="ml-2" onClick={onCreateNewProject}>
        <PlusCircledIcon className="mr-2" />
        Create new Project
      </Button>
    </div>
  );
}
