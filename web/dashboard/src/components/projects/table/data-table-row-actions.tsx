'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, DropdownMenuPortal,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ClipboardCopy, Mail, MessageSquare, Pencil, PlusCircle, Trash } from 'lucide-react';
import { MouseEventHandler, useState } from 'react';
import { Dialog, DialogTrigger } from '@radix-ui/react-dialog';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { deleteProject } from '@/data/projects/actions';
import type { Project } from '@/data/projects/dto';
import DotsIcon from '@/components/ui/icons/DotsIcon';
import { useSession } from 'next-auth/react';

export function ProjectsDataTableRowActions({ table, row }) {
  const project = row.original;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: session } = useSession();

  const handleDeleteOk = async () => {
    setDeleteDialogOpen(false);

    const { data, setData } = table.getState();
    if (project) {
      const deleted = await deleteProject(project.id, session?.user?.id);

      if (deleted.success) {
        setData(
          data.filter(
            (eachProject: Project) => project.name !== eachProject.name
          )
        );
        toast({
          title: `Project ${project.name} was deleted successfully`
        });
      }

      toast({
        title: `Project ${project.name} could not be deleted`
      });
    }
  };

  const copyProjectUrl: (id: string) => MouseEventHandler = (id) => () => {
    navigator.clipboard.writeText(
      window.location.origin +
      `/api/v1/environments/${id}/components`
    ).then(() => {
      toast({
        title: 'Project URL copied to clipboard'
      });
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
            <DotsIcon data-testid="ethereal-dots-icon" width="20" height="20" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              <span>Copy URL</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {
                  project.environments.map(e =>
                    <DropdownMenuItem key={e.id} onClick={copyProjectUrl(e.id)}>
                      <span>{e.name}</span>
                    </DropdownMenuItem>)
                }
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <Link href={`/projects/${project.id}`}>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
          </Link>
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
                  onClick={() => handleDeleteOk()}
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
