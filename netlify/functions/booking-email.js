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
const { sendBookingEmail, sendBookingSms, sendAdminNotification } = require('./_email');

exports.handler = async (event) => {
  console.log('[booking-email] invoked', event.httpMethod);
  // optional shared-secret check
  if (process.env.WEBHOOK_SECRET && event.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    console.log('[booking-email] 401 secret mismatch (header present:', !!event.headers['x-webhook-secret'], ')');
    return { statusCode: 401, body: 'unauthorized' };
  }
  let body;
  try { body = JSON.parse(event.body); } catch (e) { console.log('[booking-email] bad json'); return { statusCode: 400, body: 'bad json' }; }
  console.log('[booking-email] type=' + body.type + ' table=' + body.table);
  if (body.table !== 'bookings') return { statusCode: 200, body: 'ignored' };

  const rec = body.record || {};
  const old = body.old_record || {};

  // NEW booking request -> notify the admin
  if (body.type === 'INSERT') {
    console.log('[booking-email] new booking ' + rec.id + ' for ' + (rec.customer && rec.customer.email));
    try { await sendAdminNotification(rec); } catch (e) { console.error('[booking-email] admin notify failed', e); return { statusCode: 500, body: 'admin notify failed' }; }
    return { statusCode: 200, body: 'admin notified' };
  }

  if (body.type !== 'UPDATE') return { statusCode: 200, body: 'ignored' };
  if (rec.status === old.status) { console.log('[booking-email] no status change (' + rec.status + ')'); return { statusCode: 200, body: 'no status change' }; }
  console.log('[booking-email] status ' + old.status + ' -> ' + rec.status + ', pay=' + rec.payment_method + ', email=' + (rec.customer && rec.customer.email));

  // Which message for the new status?
  let which = null;
  if (rec.status === 'approved') which = rec.payment_method === 'cash' ? 'confirmation' : 'approval';
  else if (rec.status === 'paid' && rec.payment_method === 'card') which = 'confirmation';
  else if (rec.status === 'declined') which = 'declined';

  if (!which) { console.log('[booking-email] nothing to send for ' + rec.status); return { statusCode: 200, body: 'nothing to send for ' + rec.status }; }
  console.log('[booking-email] sending "' + which + '"');

  try {
    await sendBookingEmail(which, rec);
    await sendBookingSms(which, rec);
  } catch (e) {
    console.error('[booking-email] send failed', e);
    return { statusCode: 500, body: 'send failed' };
  }
  return { statusCode: 200, body: 'sent ' + which };
};
