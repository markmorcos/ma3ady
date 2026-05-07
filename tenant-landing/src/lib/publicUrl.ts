// Build an absolute URL anchored to the public hostname rather than the
// request-as-seen-by-the-pod. Inside the cluster `req.url` reflects the
// internal pod hostname (`ma3ady-tenant-landing-deployment-<hash>:8080`),
// which leaks out as a 303 Location header and breaks browser redirects.
//
// The ingress always sets `x-forwarded-host` (and usually
// `x-forwarded-proto`) to the public values, so prefer those.

import { env } from './env';

export function publicUrl(req: Request, path: string): URL {
  const fwdHost = req.headers.get('x-forwarded-host');
  const fwdProto = req.headers.get('x-forwarded-proto');

  let host: string;
  let proto: string;

  if (fwdHost) {
    host = fwdHost.split(',')[0]!.trim();
    proto = (fwdProto?.split(',')[0] ?? 'https').trim();
  } else {
    // Fall back to APEX_HOST so we never emit an internal pod hostname even
    // if the ingress drops the header for some reason.
    host = env.APEX_HOST;
    proto = 'https';
  }

  return new URL(path, `${proto}://${host}`);
}
