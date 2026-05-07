#!/usr/bin/env bash
# Sanity-check SPF, DKIM, and DMARC records on the production domain.
# Exits non-zero if any record is missing or wrong, so make targets / CI can
# gate the EMAIL_DISPATCHER=real flip on `make dns-check`.
#
# Usage:  make dns-check  (or)  bash scripts/dns/dns-check.sh

set -euo pipefail

DOMAIN="${DOMAIN:-ma3ady.com}"
RESEND_DKIM_HOST="resend._domainkey.$DOMAIN"
DMARC_HOST="_dmarc.$DOMAIN"

errors=0

check() {
  local label=$1 host=$2 type=$3 expect=$4
  local out
  out=$(dig +short "$type" "$host" 2>/dev/null | tr -d '"' | tr -s ' ')
  if [ -z "$out" ]; then
    echo "FAIL: $label — no $type record at $host"
    errors=$((errors + 1))
    return
  fi
  if ! echo "$out" | grep -Fq "$expect"; then
    echo "FAIL: $label"
    echo "  expected to contain: $expect"
    echo "  got:                 $out"
    errors=$((errors + 1))
    return
  fi
  echo "OK:   $label"
}

if ! command -v dig >/dev/null 2>&1; then
  echo "ERROR: 'dig' not found. Install with: brew install bind / apt install dnsutils" >&2
  exit 1
fi

check "SPF"   "$DOMAIN"            TXT "v=spf1 include:_spf.resend.com -all"
check "DKIM"  "$RESEND_DKIM_HOST"  TXT "p="
check "DMARC" "$DMARC_HOST"        TXT "v=DMARC1"
check "DMARC policy" "$DMARC_HOST" TXT "p=quarantine"
check "DMARC rua"    "$DMARC_HOST" TXT "rua="

if [ "$errors" -gt 0 ]; then
  echo
  echo "$errors record(s) failed. Fix in Cloudflare and re-run."
  echo "EMAIL_DISPATCHER=real must NOT be set in production until this passes."
  exit 1
fi

echo
echo "All DNS records verified for $DOMAIN."
