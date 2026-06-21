// ============================================================
// Netlify Function: booking-email
// Triggered by a Supabase Database Webhook on the `bookings`
// table (UPDATE). Picks the right message for the new status and
// sends it by email + SMS. Idempotent-ish: only fires when the
// status actually changes.
//
// Set up in Supabase → Database → Webhooks:
//   Table: bookings   Events: UPDATE
//   URL: https://YOUR-SITE/.netlify/functions/booking-email
//   HTTP header: x-webhook-secret: <same as WEBHOOK_SECRET env var>
//
// Env vars (Netlify): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   RESEND_API_KEY, TWILIO_* (optional), WEBHOOK_SECRET (optional)
// ============================================================
const { sendBookingEmail, sendBookingSms } = require('./_email');

exports.handler = async (event) => {
  // optional shared-secret check
  if (process.env.WEBHOOK_SECRET && event.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'unauthorized' };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'bad json' }; }
  if (body.table !== 'bookings' || body.type !== 'UPDATE') return { statusCode: 200, body: 'ignored' };

  const rec = body.record || {};
  const old = body.old_record || {};
  if (rec.status === old.status) return { statusCode: 200, body: 'no status change' };

  // Which message for the new status?
  //  approved + card  -> approval (pay-deposit link)
  //  approved + cash  -> confirmation (welcome; pay cash on collection)
  //  paid    (+ card) -> confirmation (deposit received)
  //  declined         -> decline note (only if a 'declined' template exists)
  let which = null;
  if (rec.status === 'approved') which = rec.payment_method === 'cash' ? 'confirmation' : 'approval';
  else if (rec.status === 'paid' && rec.payment_method === 'card') which = 'confirmation';
  else if (rec.status === 'declined') which = 'declined';

  if (!which) return { statusCode: 200, body: 'nothing to send for ' + rec.status };

  try {
    await sendBookingEmail(which, rec);
    await sendBookingSms(which, rec);
  } catch (e) {
    console.error('[booking-email]', e);
    return { statusCode: 500, body: 'send failed' };
  }
  return { statusCode: 200, body: 'sent ' + which };
};
