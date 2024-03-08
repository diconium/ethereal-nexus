import LoginForm from '@/components/user/login-form';
import Link from 'next/link';
import React from 'react';

export default async function AuthenticationPage() {
  const providers = [
    process.env.GITHUB_SECRET ? 'github' : false,
    process.env.AZURE_AD_CLIENT_SECRET ? 'azure-ad' : false,
  ]
    .filter(Boolean) as ('github' | 'azure-ad')[]

  return <>
    <LoginForm providers={providers}/>
    <p className="px-8 text-center text-sm text-muted-foreground">
      If you don&apos;t have an account please <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">signup here.</Link>
    </p>
  </>
}
