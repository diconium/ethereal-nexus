'use client'

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { updateMemberPermissions } from '@/data/member/actions';
import { useSession } from 'next-auth/react';
import { MemberWithPublicUser } from '@/data/member/dto';

type MemberPermissionsSelectProps = {
  member: MemberWithPublicUser;
  resource: string;
}

export function MemberPermissionsSelect({ member, resource }: MemberPermissionsSelectProps) {
  const { data: session } = useSession()
  const { id, role, user: { role: userRole } } = member;
  const hasWritePermissions = session?.user?.role === 'admin' || ['write', 'manage'].includes(session?.permissions[resource] || '');
  const permissions = userRole !== 'viewer' ? member.permissions : 'read';

  const form = useForm({defaultValues: { permissions }});

  const onSubmit = async (data) => {
    await updateMemberPermissions({id, permissions: data.permissions}, resource);
  }

  return <Form {...form}>
    <form onChange={form.handleSubmit(onSubmit)} className="space-y-8">
      <FormField
        control={form.control}
        name="permissions"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select
                {...field}
                disabled={
                  !hasWritePermissions ||
                  role === 'owner' ||
                  userRole === 'viewer'
                }
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="read">Can read</SelectItem>
                    <SelectItem value="write">Can edit</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>)}
      />
    </form>
  </Form>
}
