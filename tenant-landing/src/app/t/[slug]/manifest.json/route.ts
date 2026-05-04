import { NextResponse } from 'next/server';
import { resolveTenantBySlug } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { slug } = await ctx.params;
  const tenant = await resolveTenantBySlug(slug);
  const name = tenant?.name ?? 'ma3ady';
  const themeColor = tenant?.brand_color ?? '#0F766E';
  return NextResponse.json({
    name,
    short_name: name,
    description: `Book an appointment with ${name}.`,
    start_url: `/t/${slug}/`,
    scope: `/t/${slug}/`,
    display: 'standalone',
    theme_color: themeColor,
    background_color: '#FFFFFF',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
}
