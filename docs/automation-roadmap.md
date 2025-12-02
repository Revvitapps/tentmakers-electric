## Tentmakers Automation Backend – Implementation Roadmap

This document summarizes the remaining work to make the Tentmakers Electric backend fully automated across Service Fusion, Thumbtack, and online booking/payment flows. Each phase can be tackled independently, but the order below is recommended.

---

### Phase 1 – Service Fusion Foundations

Objective: replace the current placeholder payloads with production-ready Service Fusion requests and ensure the backend has all required credentials/configuration.

**What we need from the business:**
1. **Customer defaults**
   - Required fields (first/last name, phone, email, street, city, state, postal code, marketing source, customer type ID, campaign ID, tags, etc.).
   - Any IDs that must be applied to every new customer (e.g., `customer_type_id`, `marketing_campaign_id`).

2. **Estimate/Job configuration**
   - Required Service Fusion IDs: service list, service area, pattern row, job type, job category, appointment type, etc.
   - Default statuses for estimates and jobs.
   - Whether jobs should be created immediately or only calendar tasks (and which technicians/teams to assign by default).

3. **Calendar availability rules**
   - How many days to scan when computing openings.
   - Which technicians/teams count as available.
   - Any “busy” task types/statuses we must filter out or include.

4. **Environment variables (set in Vercel + `.env.local`)**
   - `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, optional `SF_API_BASE`.
   - `THUMBTACK_CLIENT_ID`, `THUMBTACK_CLIENT_SECRET`, `THUMBTACK_WEBHOOK_SECRET`.
   - `THUMBTACK_REDIRECT_URI`, `THUMBTACK_REDIRECT_URI_STAGING`.
   - Optional: IDs mentioned above if we prefer to store them as env vars (`SF_JOB_TYPE_LED`, etc.).

5. **Token storage decision**
   - Where to persist Service Fusion refresh tokens (if we ever use Authorization Code) and Thumbtack OAuth tokens after the callback returns them. Options: Vercel KV, Supabase/Postgres, DynamoDB, or a secure secrets store.

Deliverable: updated code under `app/api/sf/book`, `lib/sfBooking.ts`, and `lib/sfClient.ts` that uses the real field mappings, plus documentation in `README.md` explaining the required env vars and IDs.

---

### Phase 2 – Online Booking + Payment Flow

Objective: accept bookings from Wix/Estimator/AIs, collect payment, and create Service Fusion records (customer, estimate, job, payment) automatically.

**Key tasks:**
1. Extend `/api/sf/book` to accept payment metadata (processor, transaction ID, amount) and call Service Fusion’s payment API.
2. Decide how the front-end collects payments (Stripe checkout, Wix payments, thumbtack order ID) and what payload it sends to the backend.
3. Add error handling, retries, and logging so marketing/sales sees failed bookings immediately (e.g., Slack alert, email, or CRM note).
4. Optional: send confirmation emails/SMS to the customer after booking by hooking into Wix or a transactional email service.

**Dependencies:**
- Payment processor API keys & mapping between processor transaction IDs and Service Fusion payment fields (gateway ID, payment method ID, etc.).
- Decision on whether jobs should be scheduled immediately or left in a “needs scheduling” state.

Deliverable: booking endpoint that accepts a single request containing customer info, service details, schedule, and payment info, and returns the Service Fusion IDs created (customer, estimate, job, payment, calendar task).

---

### Phase 3 – Thumbtack Lead Ingestion & Two-Way Sync

Objective: automatically pull Thumbtack leads, create Service Fusion records, and (optionally) respond back to Thumbtack using OAuth tokens.

**Key tasks:**
1. Finish webhook setup: verify Thumbtack sends POSTs to `/api/thumbtack/webhook`, confirm signature validation works, map real payloads to our BookRequest shape.
2. Store Thumbtack OAuth tokens returned by `/api/thumbtack/oauth/callback(-staging)` so we can call Thumbtack’s REST endpoints (messages, quotes, order updates).
3. Implement background jobs or admin endpoints to:
   - Fetch additional lead details.
   - Update Thumbtack conversations when a booking is scheduled or completed.
   - Sync status changes (e.g., mark lead as “quoted” or “booked”).

**Dependencies:**
- A persistence layer for tokens and conversation history.
- Thumbtack scope list (what permissions we need).

Deliverable: reliable ingestion pipeline where every Thumbtack lead triggers a Service Fusion customer/estimate/job (same logic as `/api/sf/book`), with optional outbound calls to Thumbtack using stored tokens.

---

### Phase 4 – Scheduling / Availability Enhancements

Objective: polish the availability API, handle technician assignments, and connect Service Fusion to external calendars (Google Calendar mirror).

**Key tasks:**
1. Update `/api/sf/availability` to support multiple days, timezones, and real SF filters (technician IDs, task types).
2. Add caching and metrics so we can monitor how often the availability endpoint fails or returns no slots.
3. Optionally mirror Service Fusion jobs/tasks into Google Calendar by integrating Google Calendar API credentials and syncing events.
4. Provide UI endpoints or scripts for the sales team to manually block/unblock time.

Deliverable: a reliable scheduling service that both Wix and internal agents can use to show availability, and (optionally) a Google Calendar mirror so technicians see jobs on their phones.

---

### Action Items for the Owner
1. Provide the exact Service Fusion IDs (customer types, job types, service lists, technician IDs, etc.) needed for Phase 1’s payload mapping.
2. Decide where OAuth tokens should live (database, KV store, etc.) and who owns credentials to access them.
3. Confirm payment processor details and how payments should be recorded in Service Fusion (Phase 2).
4. Once #1–#3 are done, we can update the code and deploy the full workflow, then move on to Phase 3 and Phase 4 as needed.

Let us know if you would like this roadmap updated as work progresses or if the owner needs a shorter summary for stakeholders.
