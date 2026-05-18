import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Android App Links config. The SHA-256 here is the fingerprint of the
// release keystore used by .github/workflows/build-android-local.yml when the
// ANDROID_KEYSTORE_BASE64 secret is set. Adding the Play App Signing
// fingerprint (Play Console > App integrity > App signing) as a second entry
// is the right move once the app ships to Play Store.
export async function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ma3ady',
        sha256_cert_fingerprints: [
          'A5:31:B3:AF:3B:96:B1:A1:6E:8B:CC:B9:D0:2D:A8:D7:02:39:4B:B8:EE:7C:14:F3:C3:CF:0D:56:7C:88:D0:F6',
        ],
      },
    },
  ]);
}
