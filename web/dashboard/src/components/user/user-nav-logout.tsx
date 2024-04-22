'use client'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { signOutAction } from '@/auth/actions/signOutAction';

export function UserNavLogout() {
  return <DropdownMenuItem onClick={async () => {
    await signOutAction()
  }}>Log out
  </DropdownMenuItem>
}
