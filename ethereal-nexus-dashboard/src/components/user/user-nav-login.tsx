'use client'

import { signInAction } from '@/auth/actions/signInAction';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export function UserNavLogin() {
  return <DropdownMenuItem onClick={async () => {
    await signInAction()
  }}>
    Log in
  </DropdownMenuItem>
}
