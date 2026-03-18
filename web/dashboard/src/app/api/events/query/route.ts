import { NextResponse } from 'next/server';
import { queryResourceEvents } from '@/data/events/actions';
import { getToken } from 'next-auth/jwt';

export async function POST(req: Request) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token?.sub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (!body?.resourceId) {
      return NextResponse.json(
        { success: false, error: 'resourceId required' },
        { status: 400 },
      );
    }

    const queryArgs = {
      ...body,
      currentUserId: token.sub,
    };
    const result = await queryResourceEvents(queryArgs);
    if (!result.success) {
      const message = result.error.message;
      const status = message.includes('required')
        ? 400
        : message.includes('not authorized')
          ? 403
          : 500;

      return NextResponse.json({ success: false, error: message }, { status });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 },
    );
  }
}
