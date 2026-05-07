#!/usr/bin/env bash
# Prompt for tenant-landing's runtime secrets and apply them as Kubernetes
# Secrets so the deployment.yaml `valueFromSecret: <name>` references resolve.
#
# Usage:
#   ./scripts/k8s/apply-tenant-landing-secrets.sh production
#   ./scripts/k8s/apply-tenant-landing-secrets.sh preview
#
# Optional env:
#   NAMESPACE        k8s namespace (default: ma3ady for production,
#                                            ma3ady-preview for preview)
#   KUBE_CONTEXT     kubectl --context to target a specific cluster
#   DRY_RUN=1        print the manifests instead of applying
#
# The script creates one Secret per env var, named in kebab-case to match
# the `valueFromSecret:` shorthand in deployment.yaml. Each Secret stores
# the value under TWO keys to satisfy whichever convention the
# infrastructure resolver uses:
#
#   data.<ENV_VAR_NAME>: <value>   # e.g. data.SUPABASE_URL
#   data.value:         <value>    # the older convention
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

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl not found in PATH" >&2
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

echo "Target:"
echo "  env       = $ENV"
echo "  context   = ${KUBE_CONTEXT:-<current>}"
echo "  namespace = $NAMESPACE"
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

# Globals set by prompt_secret
SECRET_VALUE=

prompt_secret() {
  local label=$1
  local hint=${2:-}
  local prompt="  $label"
  [ -n "$hint" ] && prompt+=" ($hint)"
  prompt+=": "
  while :; do
    SECRET_VALUE=
    # -s: silent, -r: raw (no backslash escapes)
    read -rsp "$prompt" SECRET_VALUE
    echo
    if [ -n "$SECRET_VALUE" ]; then
      return
    fi
    echo "    empty — try again" >&2
  done
}

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
    echo "$manifest" | sed -E "s|(${env_var_name}: |value: ).*|\1<REDACTED>|"
    echo
  else
    echo "  · applying secret '$name' (keys: ${env_var_name}, value)"
    echo "$manifest" | "${KCTL[@]}" apply -f -
  fi
}

echo
echo "Enter values (input is hidden):"
prompt_secret "SUPABASE_URL" "https://<ref>.supabase.co"
SUPABASE_URL=$SECRET_VALUE

prompt_secret "SUPABASE_ANON_KEY"
SUPABASE_ANON_KEY=$SECRET_VALUE

prompt_secret "SUPABASE_SERVICE_ROLE_KEY"
SUPABASE_SERVICE_ROLE_KEY=$SECRET_VALUE

echo
apply_secret supabase-url               SUPABASE_URL              "$SUPABASE_URL"
apply_secret supabase-anon-key          SUPABASE_ANON_KEY         "$SUPABASE_ANON_KEY"
apply_secret supabase-service-role-key  SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"

# Wipe locals from the shell after we're done
unset SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SECRET_VALUE

if [ "$DRY_RUN" = "1" ]; then
  echo "(DRY_RUN=1) no changes applied"
else
  echo
  echo "Done. Verify the env reaches the pod with:"
  echo "  ${KCTL[*]} rollout restart deploy -n $NAMESPACE tenant-landing"
  echo "  ${KCTL[*]} exec -n $NAMESPACE deploy/tenant-landing -- printenv | grep SUPABASE"
fi
