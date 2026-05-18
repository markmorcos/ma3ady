// The marketing site has no Supabase dependency since the public
// booking surface moved to app.ma3ady.com.
//
// APEX_HOST is used for canonical URL construction in the sitemap
// (server-side, runtime).
//
// WEB_APP_HOST is the host of the web app (`app.ma3ady.com` on prod,
// `preview-app.ma3ady.com` on preview). It's read from
// NEXT_PUBLIC_WEB_APP_HOST so Next.js inlines it during `next build`
// and the home pages can stay `force-static` (the demo CTA URL is
// baked into the prerendered HTML). The Dockerfile receives the value
// via `ARG NEXT_PUBLIC_WEB_APP_HOST`, populated by the manifest's
// `buildArgs:` block.

export const env = {
  get APEX_HOST() {
    return process.env.APEX_HOST ?? 'ma3ady.com';
  },
  get WEB_APP_HOST() {
    const v = process.env.NEXT_PUBLIC_WEB_APP_HOST?.trim();
    if (v) return v;
    // Fallback for local dev where neither build-arg nor env is set —
    // derive from APEX_HOST so `pnpm dev` produces a sane CTA.
    const apex = process.env.APEX_HOST ?? 'ma3ady.com';
    if (apex === 'ma3ady.com') return 'app.ma3ady.com';
    if (apex === 'preview.ma3ady.com') return 'preview-app.ma3ady.com';
    return `app.${apex}`;
  },
  get ALLOW_LOCALHOST_DEMO() {
    return process.env.ALLOW_LOCALHOST_DEMO === '1';
  },
};
