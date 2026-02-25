'use client'

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { updateUserRole } from '@/data/users/actions';
import { useSession } from 'next-auth/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, UpdateRole, updateRoleSchema } from '@/data/users/dto';

type UserRoleSelectProps = {
  value: User['role'];
  userId: string;
}

export function UserRoleSelect({ value, userId }: UserRoleSelectProps) {
  const { data: session } = useSession()
  const form = useForm({
    resolver: zodResolver(updateRoleSchema as any),
    defaultValues: { id: userId, role: value }
  });

  const onSubmit = async (data: UpdateRole) => {
    await updateUserRole(data);
  }

  return <Form {...form}>
    <form onChange={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select
                {...field}
                disabled={
                  session?.user?.role !== 'admin'
                }
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-[180px]">
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
            </FormControl>
          </FormItem>)}
      />
    </form>
  </Form>
}
