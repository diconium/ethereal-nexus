import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const targetParam = request.nextUrl.searchParams.get('url');

  if (!targetParam) {
    return new NextResponse('Missing url query parameter', { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(targetParam);
  } catch (error) {
    return new NextResponse('Invalid url query parameter', { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(targetUrl.protocol)) {
    return new NextResponse('Unsupported protocol', { status: 400 });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        accept: 'text/css,*/*;q=0.1',
      },
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Failed to fetch upstream asset', {
        status: upstream.status || 502,
      });
    }

    const contentType = upstream.headers.get('content-type') ?? 'text/css';

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new NextResponse('Failed to proxy css asset', { status: 502 });
  }
}
