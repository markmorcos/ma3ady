import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

type Params = { token: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const { token } = await ctx.params;

  const url = `${env.SUPABASE_URL}/functions/v1/manage-appointment`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ token, action: 'cancel' }),
  });

  const back = new URL(`/manage/${token}`, req.url);
  if (res.ok) {
    back.searchParams.set('cancelled', '1');
  } else {
    back.searchParams.set('error', '1');
  }
  return NextResponse.redirect(back, 303);
}
