import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/((?!api|public|_next/static|_next/image|.*\\.png$|favicon\\.ico$|auth/signin|auth/signup).*)',
  ],
};

export default async function proxy(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
}
