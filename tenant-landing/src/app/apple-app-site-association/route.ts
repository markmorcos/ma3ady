import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Universal-link config. The TEAMID + bundle id are populated in the
// setup-compliance-and-launch change once Apple Developer credentials are
// finalized; this route ships a placeholder that won't activate links until
// then but doesn't 404 either.
export async function GET() {
  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs: ['REPLACE_TEAM_ID.com.ma3ady'],
            components: [{ '/': '/manage/*' }, { '/': '/t/*' }, { '/': '/' }],
          },
        ],
      },
    },
    { headers: { 'content-type': 'application/json' } },
  );
}
