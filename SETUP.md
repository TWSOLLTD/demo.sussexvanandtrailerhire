# Going live — Sussex Van & Trailer Hire

This repo has two layers:

- **The site & booking app** (`index.html`, `app.html`, `assets/…`) — the working front end.
- **The real backend** (`supabase/`, `netlify/functions/`, `netlify.toml`, `.env.example`) — the production database, security, payments and emails.

The booking app currently runs on the **prototype data layer** (`assets/booking/store.js`, browser `localStorage`) so it works offline as a demo. To go live, point it at the **real backend** below. The two are interchangeable because they expose the same `Store.*` API — the only difference is the real one is asynchronous.

---

## 1. Create the Supabase project (~5 min)
1. Sign up at supabase.com → **New project**. Note the project URL and keys (Settings → API).
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**. This creates every table, the security policies (RLS) and the signup trigger.
3. **Storage → Create bucket** (public) ×3: `listing-photos`, `gallery`, `review-photos`. Add a policy: public **read**, authenticated/admin **write**.
4. Insert the settings row (one-off, in SQL Editor) with your email templates — copy the `templates` object from the prototype's `store.js` `defaultSettings()` as the starting point:
   ```sql
   insert into public.settings (id, phone, templates) values (1, '07378 152002', '{ ...templates json... }');
   ```
5. Sign up once through the app (or Supabase Auth dashboard), then make yourself admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@youremail.com';
   ```

## 2. Wire the front end to the backend
1. In **`app.html`**, replace the prototype store with the real one:
   ```html
   <!-- remove: <script src="assets/booking/store.js?v=…"></script> -->
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script>
     window.SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
     window.SUPABASE_ANON_KEY = 'your-anon-public-key';
   </script>
   <script src="assets/booking/supabase-api.js"></script>
   ```
   Do the same on `index.html` (it uses `Store.gallery()` / `Store.approvedReviews()` for the live gallery & reviews).
2. **Make the UI calls `await`.** The prototype calls `Store.x()` synchronously; the real client returns Promises. Search the `assets/booking/*.jsx` files for `Store.` and add `await` (and make the handler `async`). The method names and arguments are identical, so this is mechanical. Tip: do it screen by screen (auth → browse → booking → admin) and test as you go.
3. Photo uploads: swap the prototype's data-URL approach for `await Store.uploadPhoto('listing-photos', file)` (or `gallery` / `review-photos`) which returns a public URL to store.

## 3. Payments (Stripe)
1. Create a Stripe account; add `STRIPE_SECRET_KEY`.
2. When an admin **approves a card booking**, create a Checkout Session (or PaymentIntent) for the deposit with `metadata.booking_id = <id>`, and email the customer the link (the `approval` template's `{{paylink}}`). A small Netlify function `create-checkout` can do this — mirror the pattern in `stripe-webhook.js`.
3. Add the webhook in Stripe → Developers → Webhooks pointing at
   `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`, events `checkout.session.completed` + `payment_intent.succeeded`. Copy its signing secret to `STRIPE_WEBHOOK_SECRET`. On success the booking flips to **paid** and the confirmation email sends automatically.
   *Cash bookings skip all this — approving them goes straight to confirmed + welcome email.*

## 4. Emails (Resend)
1. Create a Resend account, verify the `sussexvanandtrailerhire.co.uk` domain, add `RESEND_API_KEY`.
2. The confirmation email fires from the Stripe webhook; the **reminder** fires from the scheduled function `send-reminders` (daily, see `netlify.toml`). Both pull the admin-editable wording from the `settings` table via `_email.js`.

## 5. Deploy
1. Push to GitHub (already connected to Netlify) — Netlify auto-builds.
2. In **Netlify → Site settings → Environment variables**, add everything from `.env.example` with real values. (`SUPABASE_SERVICE_ROLE_KEY` and Stripe/Resend keys are server-only — they're used by the functions, never shipped to the browser.)
3. Netlify Functions and the scheduled reminder deploy automatically from `netlify/functions/`.

## Security recap
- Passwords are hashed and stored by **Supabase Auth** — never in your tables, never in the front-end bundle. The browser only holds a short-lived session token.
- **Row-Level Security** means a customer can only ever read their own bookings; only an `admin` profile can see everything, manage the fleet, moderate reviews and change roles.
- The anon key is *meant* to be public — RLS is what protects the data. The service-role key must stay server-side only.

## What stays as-is
`store.js` (prototype) can remain in the repo as an offline demo. Anyone opening the app without the Supabase config still gets the working local demo; with the config + `supabase-api.js`, it's the real thing.
