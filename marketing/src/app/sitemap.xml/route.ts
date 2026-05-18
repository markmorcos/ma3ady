import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export function GET() {
  const apex = `https://${env.APEX_HOST}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${apex}/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${apex}/" />
    <xhtml:link rel="alternate" hreflang="ar" href="${apex}/ar/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${apex}/" />
  </url>
  <url>
    <loc>${apex}/ar/</loc>
    <xhtml:link rel="alternate" hreflang="ar" href="${apex}/ar/" />
    <xhtml:link rel="alternate" hreflang="en" href="${apex}/" />
  </url>
  <url><loc>${apex}/en/privacy/</loc></url>
  <url><loc>${apex}/en/terms/</loc></url>
  <url><loc>${apex}/ar/privacy/</loc></url>
  <url><loc>${apex}/ar/terms/</loc></url>
</urlset>
`;
  return new NextResponse(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
