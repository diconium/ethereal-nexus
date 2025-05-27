'use server';

import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getApiKeys } from '@/data/users/actions';

export async function GET(req: NextRequest) {

  const session = await auth();
  const keys = await getApiKeys(session?.user?.id,false);

  if (!session) {
    return NextResponse.json('Unauthorized', { status: 401 });
  }
  if(!keys.success) {
    return NextResponse.json('No API keys found', { status: 404 });
  }

  return NextResponse.json(keys.data, { status: 200 });

}
