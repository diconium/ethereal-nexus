import UserForm from '@/components/user/user-form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import React, { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';


export default function AuthenticationPage() {
  noStore()
  const providers = [
    process.env.GITHUB_SECRET ? 'github' : false,
    process.env.AZURE_AD_CLIENT_SECRET ? 'azure-ad' : false,
  ]
    .filter(Boolean) as ('github' | 'azure-ad')[]

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
      <UserForm providers={providers} />
    </Suspense>
  </>
}
