'use server'
// app/api/cli-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth, signIn } from '@/auth';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callback');

  if (!callbackUrl) {
    return NextResponse.json({ error: 'Missing callback URL' }, { status: 400 });
  }

  // Store callback URL in cookie for later use
  (await cookies()).set('cli-callback', callbackUrl, {
    maxAge: 60 * 5, // 5 minutes
    path: '/'
  });

  const session = await auth();

  if(!session?.user) {
    console.log("No session found, redirecting to Keycloak auth page");
    return await signIn();
  }

  return NextResponse.redirect(new URL('/api/v1/cli-auth/callback', req.url));
}
