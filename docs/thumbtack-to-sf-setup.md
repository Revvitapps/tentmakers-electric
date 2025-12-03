## Thumbtack → Service Fusion Integration (Staging Checklist)

End goal: Thumbtack lead/webhook → normalize to `BookRequest` → create **Service Fusion estimate** with status “Estimate Requested”, owner = Joe, **no calendar task**.

### 1) Prereqs & Env
- Thumbtack staging client ID/secret, redirect URIs (staging + prod), and a place to persist access/refresh tokens + webhookIDs (DB/KV).
- Service Fusion: owner ID for “Joe”, default estimate status (“Estimate Requested” confirmed), and SF credentials already in Vercel.
- Webhook auth: choose `TT_WEBHOOK_USER` / `TT_WEBHOOK_PASS` for Basic auth on our webhook endpoint.

### 2) Thumbtack Staging Accounts
1. Visit https://staging-partner.thumbtack.com/ (use staging creds from AM).
2. Create a **Customer** account; sign out.
3. Create a **Pro** account; add at least one **Business** (note `businessID`, zip, category). Add a placeholder CC/SSN per TT guidance.
4. Add a review to your business (staging flow).

### 3) OAuth (Staging)
1. Implement/run OAuth code flow with staging client ID/secret + redirect URI.
2. Exchange `code` → `access_token` + `refresh_token`; **store** securely.
3. Verify token via `GET /v4/users/self` (authCode bearer).

### 4) Register Business Webhook (Staging)
Use the staging `access_token` and your businessID:
- `POST /api/v4/businesses/{businessID}/webhooks`
```json
{
  "webhookURL": "https://<your-vercel-app>/api/thumbtack/webhook",
  "eventTypes": ["MessageCreatedV4", "NegotiationCreatedV4"],
  "enabled": true,
  "auth": { "username": "TT_WEBHOOK_USER", "password": "TT_WEBHOOK_PASS" }
}
```
Save the returned `webhookID`.

### 5) Webhook Handler Mapping
- Secure with Basic auth (`TT_WEBHOOK_USER`/`TT_WEBHOOK_PASS`).
- Map payload → `BookRequest`:
  - `source`: "Thumbtack"
  - `customer`: name/phone/email from payload (normalize phone to digits, trim name)
  - `address`: address1/2, city, state, zip
  - `service`: category/name as `type`; description/details/messages as `notes`
  - `schedule`: derive date/time window from `proposedTimes` or `booking.start` if present (slice to `YYYY-MM-DD`, `HH:mm`)
  - `metadata`: lead/negotiation/request IDs, budget, raw payload
- Call SF booking helper to create **estimate only** with:
  - status: “Estimate Requested”
  - owner: Joe’s SF owner ID
  - lead_source: "Thumbtack"
  - description/notes built from the BookRequest (include IDs, budget, requested time/address)
- Do **not** create calendar tasks for Thumbtack flow (per current goal).

### 6) Test Loop (Staging)
1. Set webhook to **debug-only** mode first (return BookRequest, skip SF) to validate mapping.
2. From staging customer account, contact your staging business (start negotiation/message).
3. Check webhook logs → confirm BookRequest fields.
4. Disable debug, allow SF call → confirm estimate created in SF with status “Estimate Requested”, owner Joe, and correct description.

### 7) Promote to Production
1. Swap to production TT client ID/secret, redirect URIs, and register production webhooks on the live businessID.
2. Set production Basic auth creds for webhooks.
3. Re-run a single live lead to confirm SF estimate creation.

### Notes / Data Needed
- `businessID` (staging + prod) to register webhooks.
- Preferred owner ID in SF for Thumbtack leads.
- Confirm which TT event(s) carry full lead info (`NegotiationCreatedV4` vs `MessageCreatedV4`); sample payloads help finalize the mapper.
