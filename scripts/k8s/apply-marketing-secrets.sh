#!/usr/bin/env bash
# Read Supabase secrets from secrets/secrets.local.toml and apply them as
# Kubernetes Secrets in the target namespace, so any service that
# references them (currently web/deployment.yaml's buildArgs) resolves
# correctly. The marketing service no longer needs Supabase keys, but
# the secrets remain useful in the namespace for app.ma3ady.com builds.
#
# Usage:
#   ./scripts/k8s/apply-marketing-secrets.sh production
#   ./scripts/k8s/apply-marketing-secrets.sh preview
#
# Reads from:
#   secrets/secrets.local.toml → [k8s.<env>] section
#   Required keys: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#
# Optional env:
#   NAMESPACE        k8s namespace (default: ma3ady for production,
#                                            ma3ady-preview for preview)
#   KUBE_CONTEXT     kubectl --context to target a specific cluster
#   SECRETS_FILE     path override (default: secrets/secrets.local.toml)
#   DRY_RUN=1        print the manifests instead of applying
#
# Each Secret stores the value under TWO keys to satisfy whichever
# convention the infrastructure resolver uses:
#
#   data.<ENV_VAR_NAME>: <value>   # e.g. data.SUPABASE_URL
#   data.value:          <value>   # the older convention
#
# Writing both is harmless and avoids the "env var injected but empty"
# trap when the resolver looks up a key the script didn't write.

set -euo pipefail

ENV=${1:-}
case "$ENV" in
  production|preview) ;;
  *)
    echo "Usage: $0 <production|preview>" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE=${SECRETS_FILE:-"$REPO_ROOT/secrets/secrets.local.toml"}

if [ ! -f "$SECRETS_FILE" ]; then
  echo "ERROR: $SECRETS_FILE not found" >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl not found in PATH" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found in PATH (needed to parse the TOML)" >&2
  exit 1
fi

if [ "$ENV" = "production" ]; then
  NAMESPACE=${NAMESPACE:-ma3ady}
else
  NAMESPACE=${NAMESPACE:-ma3ady-preview}
fi
DRY_RUN=${DRY_RUN:-0}

KCTL=(kubectl)
if [ -n "${KUBE_CONTEXT:-}" ]; then
  KCTL+=(--context "$KUBE_CONTEXT")
fi

# Read a single key out of [k8s.<env>] in the toml. Empty string if missing.
read_value() {
  local key=$1
  (cd "$REPO_ROOT" && node -e '
    const fs = require("fs");
    const T = require("@iarna/toml");
    const [file, env, key] = process.argv.slice(1);
    const tree = T.parse(fs.readFileSync(file, "utf8"));
    const section = (tree.k8s && tree.k8s[env]) || {};
    process.stdout.write(String(section[key] || ""));
  ' "$SECRETS_FILE" "$ENV" "$key")
}

SUPABASE_URL=$(read_value SUPABASE_URL)
SUPABASE_ANON_KEY=$(read_value SUPABASE_ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY=$(read_value SUPABASE_SERVICE_ROLE_KEY)

missing=()
[ -z "$SUPABASE_URL" ]              && missing+=("SUPABASE_URL")
[ -z "$SUPABASE_ANON_KEY" ]         && missing+=("SUPABASE_ANON_KEY")
[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && missing+=("SUPABASE_SERVICE_ROLE_KEY")
if [ ${#missing[@]} -gt 0 ]; then
  echo "ERROR: the following keys are empty in [k8s.$ENV] of $SECRETS_FILE:" >&2
  for k in "${missing[@]}"; do echo "  - $k" >&2; done
  exit 1
fi

echo "Target:"
echo "  env       = $ENV"
echo "  context   = ${KUBE_CONTEXT:-<current>}"
echo "  namespace = $NAMESPACE"
echo "  source    = $SECRETS_FILE [k8s.$ENV]"
echo

read -rp "Continue? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) echo "aborted"; exit 0 ;;
esac

if [ "$DRY_RUN" != "1" ]; then
  if ! "${KCTL[@]}" get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo "namespace '$NAMESPACE' does not exist — creating"
    "${KCTL[@]}" create namespace "$NAMESPACE"
  fi
fi

apply_secret() {
  local name=$1            # kebab-case Secret name (e.g. supabase-url)
  local env_var_name=$2    # SCREAMING_SNAKE env var (e.g. SUPABASE_URL)
  local value=$3
  local manifest
  manifest=$("${KCTL[@]}" -n "$NAMESPACE" create secret generic "$name" \
    "--from-literal=${env_var_name}=${value}" \
    "--from-literal=value=${value}" \
    --dry-run=client -o yaml)
  if [ "$DRY_RUN" = "1" ]; then
    echo "--- $name ---"
    echo "$manifest" | awk -v env="$env_var_name" '
      /^  / && ($1 == env":" || $1 == "value:") { print "  " $1 " <REDACTED>"; next }
      { print }
    '
    echo
  else
    echo "  · applying secret '$name' (keys: ${env_var_name}, value)"
    echo "$manifest" | "${KCTL[@]}" apply -f -
  fi
}

apply_secret supabase-url               SUPABASE_URL              "$SUPABASE_URL"
apply_secret supabase-anon-key          SUPABASE_ANON_KEY         "$SUPABASE_ANON_KEY"
apply_secret supabase-service-role-key  SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"

# Wipe locals from the shell after we're done
unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY

if [ "$DRY_RUN" = "1" ]; then
  echo "(DRY_RUN=1) no changes applied"
else
  echo
  echo "Done. Secrets now available to any service in '$NAMESPACE' that"
  echo "references them via secretKeyRef (e.g. web/deployment.yaml's"
  echo "EXPO_PUBLIC_SUPABASE_URL build arg)."
fi
