import { auth } from '@/auth';
import {NextRequest, NextResponse} from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn) {
    return Response.redirect(new URL(
      `/auth/signin`,
      nextUrl
    ));
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|signup|auth|.*\\.png$).*)'],
};
