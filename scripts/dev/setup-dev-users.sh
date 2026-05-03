#!/usr/bin/env bash
# Creates a deterministic set of dev test users and seeds memberships against
# the `demo` tenant so the mobile app has something to sign into during
# development without needing real Google OAuth.
#
# Run:  make dev-users
# Run again any time after `supabase db reset`; the script is idempotent.

set -euo pipefail

SUPABASE_STATUS=$(pnpm exec supabase status -o json 2>/dev/null)
SUPABASE_URL=$(echo "$SUPABASE_STATUS" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.API_URL||'')})")
SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.SERVICE_ROLE_KEY||'')})")
DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: couldn't read SUPABASE_URL / SERVICE_ROLE_KEY from supabase status" >&2
  exit 1
fi

DEV_PASSWORD=${DEV_PASSWORD:-devpassword}

create_user() {
  local email=$1
  local full_name=$2
  echo "  · ensuring $email ..."
  curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$DEV_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$full_name\"}}" \
    -o /dev/null -w "    HTTP %{http_code}\n" || true
}

echo "Creating dev users (password: $DEV_PASSWORD)..."
create_user "dev-owner@example.com" "Dev Owner"
create_user "dev-admin@example.com" "Dev Admin"
create_user "dev-staff@example.com" "Dev Staff"
create_user "dev-customer@example.com" "Dev Customer"

echo
echo "Granting demo-tenant memberships..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "
  insert into public.memberships (tenant_id, user_id, role)
  select t.id, u.id, 'owner'
  from public.tenants t, auth.users u
  where t.slug = 'demo' and lower(u.email) = 'dev-owner@example.com'
  on conflict (user_id, tenant_id) do nothing;

  insert into public.memberships (tenant_id, user_id, role)
  select t.id, u.id, 'admin'
  from public.tenants t, auth.users u
  where t.slug = 'demo' and lower(u.email) = 'dev-admin@example.com'
  on conflict (user_id, tenant_id) do nothing;

  insert into public.memberships (tenant_id, user_id, role)
  select t.id, u.id, 'staff'
  from public.tenants t, auth.users u
  where t.slug = 'demo' and lower(u.email) = 'dev-staff@example.com'
  on conflict (user_id, tenant_id) do nothing;

  -- dev-customer@ has no membership; mimics a guest who later signs in.
"

echo
echo "Done. Sign in with:"
echo "  dev-owner@example.com / $DEV_PASSWORD     (owner of demo tenant)"
echo "  dev-admin@example.com / $DEV_PASSWORD     (admin of demo tenant)"
echo "  dev-staff@example.com / $DEV_PASSWORD     (staff of demo tenant)"
echo "  dev-customer@example.com / $DEV_PASSWORD  (no memberships yet)"
