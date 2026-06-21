# Turning on automatic Emails + SMS

The code is already in the repo (`netlify/functions/`). To switch it on you create
two accounts, paste a handful of keys into Netlify, and add one webhook in Supabase.
Email and SMS are independent — you can do email only, or both.

When a booking's **status changes**, a Supabase webhook calls the `booking-email`
function, which sends the right message:

| Status change | Email + SMS sent |
|---|---|
| approved · **card** | "approved — pay your deposit" (with pay link) |
| approved · **cash** | "you're booked in" welcome (pay cash on collection) |
| paid · card | "you're booked in" confirmation (deposit received) |
| (daily cron) hire ends tomorrow | end-of-hire reminder |

All wording comes from the **admin → Emails** tab, so you can edit it any time.

---

## 1. Email — Resend (~10 min)
1. Sign up at **resend.com** (free tier ≈ 3,000 emails/month).
2. **Add Domain** → `sussexvanandtrailerhire.co.uk` → add the DNS records it shows
   (SPF/DKIM) at your domain registrar. Wait for "Verified".
   *(Want to test before DNS is ready? Resend gives you an `onboarding@resend.dev`
   sender you can use temporarily — change the `from:` in `_email.js`.)*
3. **API Keys → Create** → copy the `re_…` key.
4. In **Netlify → Site settings → Environment variables** add:
   `RESEND_API_KEY = re_…`

## 2. SMS — Twilio (optional, ~15 min)
1. Sign up at **twilio.com** (you get trial credit; then pay-as-you-go ≈ 4p/UK text).
2. From the Console copy **Account SID** and **Auth Token**.
3. Sender: in the UK you can send with an **Alphanumeric Sender ID** (e.g. `SussexHire`,
   max 11 chars, letters/numbers) — no number to buy. (Note: alphanumeric senders are
   one-way; customers can't reply. If you want replies, buy a UK number instead.)
4. In **Netlify → Environment variables** add:
   `TWILIO_ACCOUNT_SID = AC…`
   `TWILIO_AUTH_TOKEN = …`
   `TWILIO_FROM = SussexHire`
   *(Leave these blank and SMS simply stays off — email still works.)*

## 3. Service-role key + webhook secret (needed for both)
1. In **Supabase → Project Settings → API**, copy the **service_role** key (the secret one).
   In **Netlify → Environment variables** add:
   `SUPABASE_URL = https://tbfujjnlgtdzazxdiact.supabase.co`
   `SUPABASE_SERVICE_ROLE_KEY = …`  ← server-only, never goes in the browser
2. Make up a long random string and add it as `WEBHOOK_SECRET = …`.

## 4. The trigger — Supabase Database Webhook
1. **Supabase → Database → Webhooks → Create a new hook**.
2. Name: `booking-status-email`. Table: **bookings**. Events: **Update**.
3. Type: **HTTP Request** · Method **POST** ·
   URL: `https://demo.sussexvanandtrailerhire.co.uk/.netlify/functions/booking-email`
   (use your live site URL).
4. Add an HTTP header: `x-webhook-secret` = the same value as `WEBHOOK_SECRET`.
5. Save.

## 5. Redeploy
After adding env vars, trigger a redeploy in Netlify (or push any commit) so the
functions pick up the new variables. Then approve a test booking and watch the
email/SMS arrive.

---

### Quick test
- Approve a *card* booking in admin → customer gets the "pay your deposit" email/SMS.
- Mark it paid → customer gets the confirmation.
- Approve a *cash* booking → customer gets the welcome confirmation straight away.
- The reminder runs automatically each morning (08:00 UTC) for hires ending the next day.

### Costs at a glance
- Resend: free up to ~3,000 emails/month.
- Twilio: no monthly fee; ~4p per UK SMS sent.
- Supabase + Netlify: free tiers cover this comfortably.
