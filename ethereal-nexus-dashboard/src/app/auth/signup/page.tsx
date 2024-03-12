import UserForm from '@/components/user/user-form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import React, { Suspense } from 'react';

export default function AuthenticationPage() {
  return <>
    <Link
      href="/auth/signin"
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "absolute right-4 top-4 md:right-8 md:top-8"
      )}
    >
      Login
    </Link>
    <Suspense>
      <UserForm />
    </Suspense>
  </>
}
