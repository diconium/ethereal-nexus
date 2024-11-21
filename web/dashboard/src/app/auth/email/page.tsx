import LoginForm from '@/components/user/login-form';
import Link from 'next/link';
import React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

export default async function AuthenticationPage() {
  noStore()

  return <div className="flex flex-col space-y-2 text-center">
    <h1 className="text-2xl font-semibold tracking-tight">
      Magic Link sent!
    </h1>
    <p className="text-sm text-muted-foreground">
      Please follow the signin link sent to your email to login to your account. Or if you prefer <Link href="/auth/signin" className="underline underline-offset-4 hover:text-primary">login here.</Link>
    </p>
  </div>
}
