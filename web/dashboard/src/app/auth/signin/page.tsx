import LoginForm from '@/components/user/login-form';
import Link from 'next/link';
import React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

export default async function AuthenticationPage() {
  const AUTH_ALLOW_SIGNUP = process.env.AUTH_ALLOW_SIGNUP === 'true';
  const SSOLabel = process.env.AUTH_SSO_LABEL;
  noStore();
  const providers = [
    process.env.AUTH_CREDENTIALS_LOGIN === 'false' ? false : 'credentials',
    process.env.AUTH_GITHUB_SECRET ? 'github' : false,
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ? 'microsoft-entra-id' : false,
    process.env.COMMUNICATION_SERVICES_CONNECTION_STRING ? 'azure-communication-service' : false,
    process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER ? 'keycloak' : false,
  ]
    .filter(Boolean) as ('credentials' | 'github' | 'microsoft-entra-id' | 'azure-communication-service' | 'keycloak' | false)[];

  return <>
    <LoginForm providers={providers} SSOLabel={SSOLabel} />
    {AUTH_ALLOW_SIGNUP ?
      <p className="px-8 text-center text-sm text-muted-foreground">
        If you don&apos;t have an account please
        <Link href="/auth/signup" className="underline underline-offset-4 hover:text-primary">signup
        here.</Link>
      </p> : null}
  </>;
}
