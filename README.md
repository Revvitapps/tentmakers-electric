
Marketing assets, HTML email templates, and the LED Recessed Lighting estimator.

- `email/` – HTML email templates (Wix-compatible)
- `estimator/` – LED estimator (embed on Wix)
- `assets/` – Logos, brand colors, images
- `data/` – Contact lists, cleaned CSVs
- `scripts/` – Utilities (e.g., CSV name-split)

## Automation backend (Next.js)

The `/app` directory contains the API routes that connect Wix/Thumbtack to Service Fusion. Deploy the project via Vercel and configure the following environment variables in both `.env.local` and Vercel → Project Settings → Environment Variables.

| Variable | Description |
| --- | --- |
| `SF_CLIENT_ID` / `SF_CLIENT_SECRET` | Service Fusion OAuth credentials (Client Credentials flow) |
| `SF_API_BASE` | Optional override for the Service Fusion API base (`https://api.servicefusion.com/v1` by default) |
| `THUMBTACK_CLIENT_ID` / `THUMBTACK_CLIENT_SECRET` | Thumbtack OAuth credentials |
| `THUMBTACK_WEBHOOK_SECRET` | Secret used to validate Thumbtack webhooks |
| `THUMBTACK_REDIRECT_URI` | Production OAuth callback URL (e.g. `https://tentmakers-electric.vercel.app/api/thumbtack/oauth/callback`) |
| `THUMBTACK_REDIRECT_URI_STAGING` | Staging OAuth callback URL (e.g. `https://tentmakers-electric.vercel.app/api/thumbtack/oauth/callback-staging`) |

Thumbtack OAuth endpoints:

- Production: `/api/thumbtack/oauth/callback`
- Staging/sandbox: `/api/thumbtack/oauth/callback-staging`

Both endpoints exchange the `code` Thumbtack sends for an access/refresh token pair and return the token payload so you can store it securely (database, secret manager, etc.). Update the placeholders above if you deploy to a different domain.
