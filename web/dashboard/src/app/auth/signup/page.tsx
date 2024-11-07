import UserForm from '@/components/user/user-form';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import React, { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';


export default function AuthenticationPage() {
  noStore()
  const providers = [
    process.env.AUTH_CREDENTIALS_LOGIN === 'false' ? false : 'credentials',
    process.env.AUTH_GITHUB_SECRET ? 'github' : false,
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ? 'microsoft-entra-id' : false,
    process.env.COMMUNICATION_SERVICES_CONNECTION_STRING ? 'azure-communication-service' : false,
  ]
    .filter(Boolean) as ('credentials' | 'github' | 'microsoft-entra-id' | 'azure-communication-service' | false)[]

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
