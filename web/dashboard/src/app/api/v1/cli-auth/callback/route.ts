'use server';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import process from 'node:process';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, raw: true });
  const callbackUrl = (await cookies()).get('cli-callback')?.value;

  if (!callbackUrl) {
    return NextResponse.json({ error: 'Callback URL is missing' }, { status: 400 });
  }

  if (token) {
    const redirectUrl = new URL(callbackUrl);
    redirectUrl.searchParams.set('token', token);
    return NextResponse.redirect(redirectUrl);
  } else {
    // Not Signed in
    return NextResponse.json({ error: 'Authentication failed or callback lost' }, { status: 401 });
  }
}
