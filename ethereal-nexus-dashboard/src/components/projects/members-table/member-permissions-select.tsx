'use client'

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { updateMemberPermissions } from '@/data/member/actions';

type MemberPermissionsSelectProps = {
  value: string;
  memberId: string;
}

export function MemberPermissionsSelect({ value, memberId }: MemberPermissionsSelectProps) {
  const form = useForm({defaultValues: { permissions: value }});

  const onSubmit = async (data) => {
    await updateMemberPermissions({id: memberId, permissions: data.permissions})
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
