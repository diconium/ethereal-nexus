"use client";

import {DataTableColumnHeader} from "./data-table-column-header";
import {Switch} from "@/components/ui/switch";
import * as React from "react";
import {Dialog} from "@/components/ui/dialog";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {CaretSortIcon, CheckIcon} from "@radix-ui/react-icons";
import {Command, CommandItem, CommandList} from "@/components/ui/command";

function VersionDialog({versions: versionsWithoutLatest = [], onChangeVersion, selectedVersion = 'latest'}: {
    versions: string[],
    selectedVersion: string,
    onChangeVersion: (newVersion: string) => void
}) {
    const versions = ['latest', ...versionsWithoutLatest];
    const [open, setOpen] = React.useState(false);
    const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);

    return (
        <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="secondary"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="Select a team"
                        className={cn("w-[200px] justify-between")}
                    >
                        {selectedVersion}
                        <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandList>
                            {versions.map((version) => (
                                <CommandItem
                                    key={version}
                                    onSelect={() => {
                                        onChangeVersion(version);
                                        setOpen(false);
                                    }}
                                    className="text-sm"
                                >
                                    {version}
                                    <CheckIcon
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            selectedVersion === version
                                                ? "opacity-100"
                                                : "opacity-0",
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </Dialog>
    );
}

export const columns = [
    {
        accessorKey: "name",
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Name"/>
        ),
        cell: ({row}) => <div className="w-[80px]">{row.getValue("name")}</div>,
        enableSorting: true,
        enableHiding: true,
    },
    {
        accessorKey: "title",
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Title"/>
        ),
        cell: ({row}) => <div className="w-[80px]">{row.getValue("title")}</div>,
        enableSorting: true,
        enableHiding: true,
    },
    {
        accessorKey: "version",
        header: ({column}) => (
            <DataTableColumnHeader column={column} title="Version"/>
        ),
        cell: ({table, row}) => (
            <div className="h-9 w-[80px]">
                {row.getIsSelected() &&
                    <VersionDialog
                        versions={row.original.versions} // TODO check the proper way to do this
                        selectedVersion={table.getState().projectComponents.find(component => component.name === row.getValue('name'))?.version}
                        onChangeVersion={(newVersion) => table.getState().setProjectComponents([...table.getState().projectComponents.filter(component => component.name != row.getValue('name')), {
                            name: row.getValue('name'),
                            version: newVersion
                        }])}/>}
            </div>
        ),
        enableSorting: false,
        enableHiding: true,
    },
    {
        id: "select",
        header:
            ({column}: any) => (
                <DataTableColumnHeader column={column} title="Active"/>
            ),
        cell:
            ({row}) => (
                <Switch
                    checked={row.getIsSelected()/*selectedComponents.some(selectedComponent => selectedComponent === item.name)*/}
                    onCheckedChange={(value) => row.toggleSelected(!!value)/*checked => checked ? onAdd(item) : onRemove(item)*/}/>
            ),
        enableSorting: false,
        enableHiding: false,
    },
];
