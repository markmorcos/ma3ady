#!/usr/bin/env bash
# Provisions the single Supabase auth user used by the app-store review
# backdoor (long-press the Logo on the sign-in screen → ReviewAccessSheet).
# Idempotent: re-running rotates the password to a fresh value.
#
# Run against the production Supabase project:
#
#   SUPABASE_URL='https://<prod-ref>.supabase.co' \
#   SUPABASE_SERVICE_ROLE_KEY='<service role key>' \
#     bash scripts/store/create-review-user.sh
#
# Or against preview by swapping the URL + key. Always run once after
# rotating the credentials (e.g. before each new Play submission) so the
# password in Play Console matches a live row.

set -euo pipefail

REVIEW_EMAIL="playreview-c0cfeed3-a751-4076-991a-d582188203ea@ma3ady.app"

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  cat >&2 <<'MSG'
ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.

Find both in:
  - Production: Supabase dashboard → Settings → API
  - Local dev:  `pnpm exec supabase status` (use the SERVICE_ROLE_KEY)
MSG
  exit 1
fi

# Generate a 32-char password from /dev/urandom unless the caller pinned one
# explicitly. Mixed case + digits keeps Play Console's credential form happy
# (rejects all-lowercase as "too simple").
if [ -z "${REVIEW_PASSWORD:-}" ]; then
  REVIEW_PASSWORD=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
fi

api() {
  local method=$1
  local path=$2
  local body=${3:-}
  if [ -n "$body" ]; then
    curl -s -X "$method" "$SUPABASE_URL$path" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -s -X "$method" "$SUPABASE_URL$path" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
  fi
}

# Look up an existing user with this email so we know whether to create
# vs. update. The Admin API doesn't expose a direct "get by email" — list
# + filter is the documented pattern.
existing_user_id=$(api GET "/auth/v1/admin/users?per_page=1000" \
  | node -e "
    let s='';
    process.stdin.on('data',d=>s+=d);
    process.stdin.on('end',()=>{
      const r=JSON.parse(s);
      const u=(r.users||[]).find(x=>x.email==='$REVIEW_EMAIL');
      process.stdout.write(u?u.id:'');
    });
  ")

if [ -n "$existing_user_id" ]; then
  echo "User exists ($existing_user_id) — rotating password..."
  api PUT "/auth/v1/admin/users/$existing_user_id" \
    "{\"password\":\"$REVIEW_PASSWORD\"}" >/dev/null
else
  echo "Creating user..."
  api POST "/auth/v1/admin/users" \
    "{\"email\":\"$REVIEW_EMAIL\",\"password\":\"$REVIEW_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"Play Store Review\",\"purpose\":\"app-store-review\"}}" \
    >/dev/null
fi

cat <<MSG

✓ Review user ready.

Paste these into Play Console → App content → App access → Login credentials:

  Email:    $REVIEW_EMAIL
  Password: $REVIEW_PASSWORD

The password isn't stored anywhere by this script — copy it now.
Re-run the script to rotate. To revoke entirely (banned + null password),
use the Supabase dashboard or the admin API directly.

MSG
