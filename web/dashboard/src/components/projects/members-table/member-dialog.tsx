'use client';

import { CheckIcon } from '@radix-ui/react-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import React, { type MouseEventHandler, useState } from 'react';
import { PublicUser } from '@/data/users/dto';
import { insertMembers } from '@/data/member/actions';
import { toast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';

type AddMemberProps = {
  users: PublicUser[];
  resource: string;
}

export function MemberDialog({ users, resource }: AddMemberProps) {
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<PublicUser[]>([]);

  const { data: session } = useSession();
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[resource] || '');

  const handleSubmit: MouseEventHandler = async () => {
    setOpen(false);
    const newMembers = selectedUsers
      .map(user => ({
        resource,
        user_id: user.id,
      }));
    const members = await insertMembers(newMembers);
    if(members.success) {
      toast({
        title: 'Member added successfully!',
      });
    } else {
      toast({
        title: 'Failed to add member.',
        description: members.error.message,
      });
    }
  };

  return (
    <>
      <Button
        disabled={!hasWritePermissions}
        size="base"
        onClick={() => setOpen(true)}
        className="ml-auto flex">
        <Plus />
        Add User
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 outline-none">
          <DialogHeader className="px-4 pb-4 pt-5">
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Add a user to this project so it can have access to it.
            </DialogDescription>
          </DialogHeader>
          <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
            <CommandInput placeholder="Search user..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup className="p-2">
                {users.map((user) => (
                  <CommandItem
                    key={user.email}
                    className="flex items-center px-2"
                    onSelect={() => {
                      if (selectedUsers.includes(user)) {
                        return setSelectedUsers(
                          selectedUsers.filter(
                            (selectedUser) => selectedUser !== user
                          )
                        );
                      }

                      return setSelectedUsers(
                        [...users].filter((u) =>
                          [...selectedUsers, user].includes(u)
                        )
                      );
                    }}
                  >
                    <Avatar>
                      <AvatarImage src={user.image || undefined} alt="Image" />
                      <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="ml-2">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    {selectedUsers.includes(user) ? (
                      <CheckIcon className="ml-auto flex h-5 w-5 text-primary" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter className="flex items-center border-t p-4 sm:justify-between">
            {selectedUsers.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {selectedUsers.map((user) => (
                  <Avatar
                    key={user.email}
                    className="inline-block border-2 border-background"
                  >
                    <AvatarImage src={user.image || undefined} alt="Image" />
                    <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select users to add to this project.
              </p>
            )}
            <Button
              disabled={selectedUsers.length < 1}
              onClick={handleSubmit}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}