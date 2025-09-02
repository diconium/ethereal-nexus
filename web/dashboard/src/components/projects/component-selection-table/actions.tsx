"use client";

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogTrigger } from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { deleteComponentConfig } from '@/data/projects/actions';
import DotsIcon from '@/components/ui/icons/DotsIcon';
import { useSession } from 'next-auth/react';

export function ProjectsComponentsRowActions({ table, row }) {
  const component = row.original;
  const project = table.options.meta.projectId
  const {data: session} = useSession()
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[project] || '');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteOk = async () => {
    setDeleteDialogOpen(false)

    if (component) {

      const deleted = await deleteComponentConfig(component.config_id, project, component.id)

      if(deleted.success) {
        toast({
          title: `Component ${component.name} was removed successfully`,
        });
      } else {
        toast({
          title: `Component ${component.name} could not be removed`,
        });
      }
    }
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          >
            <DotsIcon data-testid="ethereal-dots-icon" width="20" height="20"/>
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem
                disabled={!hasWritePermissions}
                className="text-red-600"
                onSelect={(e) => e.preventDefault()}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently remove the
                  component configuration for this project.
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
                  disabled={!hasWritePermissions}
                  variant="destructive"
                  onClick={() => handleDeleteOk()}
                >
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
