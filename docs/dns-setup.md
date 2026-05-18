# DNS setup

All DNS for `ma3ady.com` is on Cloudflare. This is a one-time bootstrap; ongoing changes go through the Cloudflare dashboard, not infra-as-code (intentional — DNS edits are rare and benefit from a manual review step).

## Records

| Type  | Name                       | Target                                | TTL   | Notes                                              |
| ----- | -------------------------- | ------------------------------------- | ----- | -------------------------------------------------- |
| A     | `@` (apex)                 | `<infra ingress IP>`                  | Auto  | Production marketing                               |
| A     | `preview`                  | `<infra ingress IP>`                  | Auto  | Preview marketing                                  |
| A     | `app`                      | `<infra ingress IP>`                  | Auto  | Production web app (`app.ma3ady.com`)              |
| A     | `preview-app`              | `<infra ingress IP>`                  | Auto  | Preview web app (`preview-app.ma3ady.com`)         |
| CNAME | `www`                      | `ma3ady.com`                          | Auto  | Redirect handled at the app/ingress layer         |
| CNAME | `auth`                     | `<supabase project ref>.supabase.co` | Auto  | Used for OAuth callback domains                    |
| CNAME | `*` (wildcard)             | `ma3ady.com`                          | Auto  | Reserves future per-tenant subdomain pivots        |
| TXT   | `@`                        | `v=spf1 include:_spf.resend.com -all` | Auto  | SPF — single record only                           |
| TXT   | `resend._domainkey`        | (paste DKIM public key from Resend)   | Auto  | DKIM — Resend → Domain → Verify                    |
| TXT   | `_dmarc`                   | `v=DMARC1; p=quarantine; rua=mailto:dmarc@ma3ady.com; ruf=mailto:dmarc@ma3ady.com; fo=1; pct=100; aspf=r; adkim=r` | Auto | DMARC |
| MX    | (none)                     | —                                     | —     | No inbound mail in v1; outbound only via Resend    |

## Verification

After the records propagate (usually <2 minutes on Cloudflare), run:

```bash
make dns-check
```

The script (`scripts/dns/dns-check.sh`) `dig`s each record and exits non-zero on drift. Sample expected output:

```
OK:   SPF
OK:   DKIM
OK:   DMARC
OK:   DMARC policy
OK:   DMARC rua

All DNS records verified for ma3ady.com.
```

Manual digs:

```bash
dig TXT ma3ady.com +short
dig TXT resend._domainkey.ma3ady.com +short
dig TXT _dmarc.ma3ady.com +short
```

## Deliverability gate

`EMAIL_DISPATCHER=real` MUST NOT be set in any production environment until **all** of the following are true:

1. `make dns-check` exits zero.
2. The Resend dashboard shows the domain status as **Verified**.
3. A test email sent from preview to a Gmail and an Outlook inbox shows `pass` for SPF, DKIM, and DMARC in the message headers.

Until then, `EMAIL_DISPATCHER` stays `mock` and emails go to the local mailpit / Resend test inbox.
