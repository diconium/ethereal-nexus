'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DeleteIcon, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogTrigger } from '@radix-ui/react-dialog';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { deleteEnvironment } from '@/data/projects/actions';
import DotsIcon from '@/components/ui/icons/DotsIcon';
import { useSession } from 'next-auth/react';

export function EnvironmentsRowActions({ row }) {
  const environment = row.original;
  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || session?.permissions[environment.project_id] === 'write';

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteOk = async () => {
    setDeleteDialogOpen(false);

    if (environment) {
      const deleted = await deleteEnvironment(environment.id, session?.user?.id);

      if (deleted.success) {
        toast({
          title: `Environment ${environment.name} was removed successfully`
        });
      } else {
        toast({
          title: `Environment ${environment.name} could not be removed`
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
            <DotsIcon data-testid="ethereal-dots-icon" width="20" height="20" />
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
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently remove the
                  environment and subsequent configurations for this project.
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
