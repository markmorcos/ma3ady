// The marketing site has no Supabase dependency since the public
// booking surface moved to app.ma3ady.com; APEX_HOST is used for
// canonical URL construction in the sitemap, and WEB_APP_HOST is
// used for cross-host CTAs (the demo booking link, sign-in link).

export const env = {
  get APEX_HOST() {
    return process.env.APEX_HOST ?? 'ma3ady.com';
  },
  get WEB_APP_HOST() {
    const explicit = process.env.WEB_APP_HOST;
    if (explicit) return explicit;
    // Sensible default: derive from the apex so a single env var is enough
    // in most environments — production maps `ma3ady.com` → `app.ma3ady.com`
    // and preview maps `preview.ma3ady.com` → `preview-app.ma3ady.com`.
    const apex = process.env.APEX_HOST ?? 'ma3ady.com';
    if (apex === 'ma3ady.com') return 'app.ma3ady.com';
    if (apex === 'preview.ma3ady.com') return 'preview-app.ma3ady.com';
    return `app.${apex}`;
  },
  get ALLOW_LOCALHOST_DEMO() {
    return process.env.ALLOW_LOCALHOST_DEMO === '1';
  },
};
