// The marketing site has no Supabase dependency since the public
// booking surface moved to app.ma3ady.com; only APEX_HOST is required
// for canonical URL construction in the sitemap.

export const env = {
  get APEX_HOST() {
    return process.env.APEX_HOST ?? 'ma3ady.com';
  },
  get ALLOW_LOCALHOST_DEMO() {
    return process.env.ALLOW_LOCALHOST_DEMO === '1';
  },
};
