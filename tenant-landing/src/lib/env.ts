// Lazy env access. Validation happens on first read of each field at request
// time so `next build` (which collects page data without env vars set) doesn't
// hard-fail. Production deploys still surface missing vars on first request.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`tenant-landing: missing env var ${name}`);
  }
  return value;
}

export const env = {
  get SUPABASE_URL() {
    return required('SUPABASE_URL');
  },
  get SUPABASE_ANON_KEY() {
    return required('SUPABASE_ANON_KEY');
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  },
  get APEX_HOST() {
    return process.env.APEX_HOST ?? 'ma3ady.com';
  },
  get ALLOW_LOCALHOST_DEMO() {
    return process.env.ALLOW_LOCALHOST_DEMO === '1';
  },
};
