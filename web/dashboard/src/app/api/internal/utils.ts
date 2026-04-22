import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';

export function ensureInternalServiceAccess(request: NextRequest) {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Internal service secret is not configured.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const header = request.headers.get('x-internal-service-key');
  if (header !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: HttpStatus.UNAUTHORIZED },
    );
  }

  return null;
}
