'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/auth/actions/signOutAction';
import { LogOut } from 'lucide-react';

export function UserNavLogout() {
  return <DropdownMenuItem
    className="flex gap-2 items-center"
    onClick={async () => {
      await signOutAction()
    }}>
      <LogOut width={16} height={16} />
      Log out
  </DropdownMenuItem>
}
