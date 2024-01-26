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
import { Project } from "@/app/api/v1/projects/model";
import { useRouter } from "next/navigation";
import { ClipboardCopy, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

export function ProjectsDataTableRowActions({ table, row }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const edit = async (project: Project) => {
    router.push(`/projects/${project._id?.toString()}`);
    router.refresh();
  };

  const handleDeleteOk = (project: Project) => {
    const { data, setData } = table.getState();
    if (project) {
      fetch(`api/v1/projects/${project._id?.toString()}`, { method: "delete" })
        .then(() => {
          setData(
            data.filter(
              (eachProject: Project) => project.name !== eachProject.name,
            ),
          );
          toast({
            title: `Project ${project.name} was deleted successfully`,
          });
          setDeleteDialogOpen(false);
        })
        .catch((error) => {
          toast({
            title: `Project ${project.name} could not be deleted`,
          });
          setDeleteDialogOpen(false);
        });
    }
  };

  const copyProjectUrl = (project: Project) => {
    navigator.clipboard.writeText(
      window.location.origin +
        `/api/v1/projects/${project._id?.toString()}/components`,
    );
    toast({
      title: "Project URL copied to clipboard",
    });
  };

  return (
    <div>
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
          <DropdownMenuItem onClick={() => copyProjectUrl(row.original)}>
            <ClipboardCopy className="mr-2 h-4 w-4" /> Copy URL
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => edit(row.original)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
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
                  project {row.original.name}.
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
    </div>
  );
}
