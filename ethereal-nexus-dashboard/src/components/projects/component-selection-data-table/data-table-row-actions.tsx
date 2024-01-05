"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EyeIcon, Trash } from "lucide-react";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Component } from "@/app/api/v1/components/model";
import { toast } from "@/components/ui/use-toast";

export function ComponentsDataTableRowActions({ table, row }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const handleDeleteOk = (component: Component) => {
    const { data, setData } = table.getState();
    if (component) {
      fetch(`api/v1/components/${component.name}`, { method: "delete" })
        .then(() => {
          setData(
            data.filter(
              (eachComponent: Component) =>
                component.name !== eachComponent.name,
            ),
          );
          toast({
            title: `Component ${component.name} was deleted successfully`,
          });
          setDeleteDialogOpen(false);
        })
        .catch((error) => {
          toast({
            title: `Component ${component.name} could not be deleted`,
          });
          setDeleteDialogOpen(false);
        });
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem>
          <EyeIcon className="mr-2 h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* TODO: ideally we'd have only one dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the
                component {row.original?.title}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteOk(row.original)}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
