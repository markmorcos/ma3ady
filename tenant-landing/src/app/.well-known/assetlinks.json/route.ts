import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Android App Links config. SHA-256 fingerprint is added in the
// setup-compliance-and-launch change once we sign the production build.
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ma3ady.app',
        sha256_cert_fingerprints: ['REPLACE_SHA256_FINGERPRINT'],
      },
    },
  ]);
}
