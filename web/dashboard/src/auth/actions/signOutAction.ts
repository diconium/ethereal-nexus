'use server';

import { signOut } from '@/auth';

export async function signOutAction() {
  return signOut();
}
