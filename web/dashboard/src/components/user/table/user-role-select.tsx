'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateUserRole } from '@/data/users/actions';
import { useSession } from 'next-auth/react';
import { User } from '@/data/users/dto';

type UserRoleSelectProps = {
  value: User['role'];
  userId: string;
};

export function UserRoleSelect({ value, userId }: UserRoleSelectProps) {
  const { data: session } = useSession();

  const handleChange = async (role: string) => {
    await updateUserRole({ id: userId, role: role as User['role'] });
  };

  return (
    <Select
      defaultValue={value}
      disabled={session?.user?.role !== 'admin'}
      onValueChange={handleChange}
    >
      <SelectTrigger className="h-8 w-32 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="admin">admin</SelectItem>
          <SelectItem value="user">user</SelectItem>
          <SelectItem value="viewer">viewer</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
