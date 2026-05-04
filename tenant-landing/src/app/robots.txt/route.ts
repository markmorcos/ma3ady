import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://${env.APEX_HOST}/sitemap.xml
`;
  return new NextResponse(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
