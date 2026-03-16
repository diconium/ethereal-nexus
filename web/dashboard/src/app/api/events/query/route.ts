import { NextResponse } from 'next/server';
import { queryResourceEvents } from '@/data/events/actions';
import { getToken } from 'next-auth/jwt';

export async function POST(req: Request) {

  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }


    const body = await req.json();

    // Ensure resourceId exists and user has access - basic guard here.
    if (!body?.resourceId) {
      return NextResponse.json(
        { success: false, error: 'resourceId required' },
        { status: 400 },
      );
    }

    console.log("body:", body);

    // Always pass currentUserId for membership validation, only pass userId for filtering
    const queryArgs = {
      ...body,
      currentUserId: token.sub,
    };
    const result = await queryResourceEvents(queryArgs);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'query failed' },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 },
    );
  }
}
