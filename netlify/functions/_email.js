// ============================================================
// Shared messaging helper — renders the admin-editable template
// from the `settings` table and sends it by EMAIL (Resend) and,
// optionally, SMS (Twilio). Used by booking-email.js (status
// webhook) and send-reminders.js (daily cron).
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Sender address. Before your domain is verified in Resend, set EMAIL_FROM to
// 'onboarding@resend.dev' (test mode can only email your own Resend account).
// Once sussexvanandtrailerhire.co.uk is verified, unset it (or use the branded one).
const EMAIL_FROM = process.env.EMAIL_FROM || 'Sussex Van & Trailer Hire <bookings@sussexvanandtrailerhire.co.uk>';

function fmtDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function shortDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// build the merge map once; both email + SMS use it
async function buildMap(booking) {
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const { data: listing } = await supabase.from('listings').select('name').eq('id', booking.listing_id).single();
  const single = booking.start_date === booking.end_date;
  const delivery = booking.delivery_price || 0;
  const total = (booking.price || 0) + (booking.deposit || 0) + delivery;
  const cash = booking.payment_method === 'cash';
  const deliveryLine = booking.fulfilment === 'delivery' ? (delivery ? `Delivery: £${delivery}.` : 'Delivery: we\u2019ll confirm the cost.') : '';
  const map = {
    customer: (booking.customer && booking.customer.name) || 'there',
    item: (listing && listing.name) || 'your item',
    start: fmtDate(booking.start_date),
    end: fmtDate(booking.end_date),
    period: single ? booking.period : 'multiple days',
    price: booking.price, deposit: booking.deposit, total,
    delivery: delivery ? ('£' + delivery) : 'TBC',
    deliverynote: deliveryLine,
    paymentnote: cash
      ? `Please bring £${total} in cash to collection${delivery ? '/delivery' : ''} — that's £${booking.price} hire${delivery ? `, £${delivery} delivery` : ''} plus a £${booking.deposit} refundable deposit.`
      : `Your refundable deposit of £${booking.deposit} has been received. The £${booking.price} hire${delivery ? ` plus £${delivery} delivery` : ''} balance is due at collection.`,
    paylink: booking.pay_url || ('https://pay.sussexvanandtrailerhire.co.uk/b/' + booking.id),
    phone: settings.phone, email: (booking.customer && booking.customer.email) || '',
    fulfilment: booking.fulfilment === 'delivery' ? 'Delivery requested — we\u2019ll confirm a time' : 'Collection from our Rustington yard'
  };
  return { map, settings, single };
}

function fill(str, map) { return String(str || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (map[k] !== undefined ? map[k] : m)); }

async function render(key, booking) {
  const { map, settings } = await buildMap(booking);
  const tpl = (settings.templates && settings.templates[key]) || { subject: '', body: '' };
  return { subject: fill(tpl.subject, map), body: fill(tpl.body, map), to: (booking.customer && booking.customer.email) };
}

// ---------- EMAIL (Resend) ----------
async function sendBookingEmail(key, booking) {
  if (!process.env.RESEND_API_KEY) { console.log('[email] SKIP: no RESEND_API_KEY set'); return; }
  const r = await render(key, booking);
  if (!r.to) { console.log('[email] SKIP: booking has no customer email', booking.id); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: r.to, subject: r.subject, text: r.body })
  });
  const txt = await resp.text();
  console.log(`[email] key=${key} to=${r.to} from="${EMAIL_FROM}" resend_status=${resp.status} resend_body=${txt.slice(0, 400)}`);
  return { status: resp.status, body: txt };
}

// ---------- SMS (Twilio) ----------
// short, friendly text per message type (we don't reuse the long email body)
function smsText(key, map) {
  if (key === 'approval') return `Hi ${map.customer}, your ${map.item} hire (${map.start}) is approved! Secure it by paying your £${map.deposit} deposit: ${map.paylink} — Sussex Van & Trailer Hire`;
  if (key === 'confirmation') return `Hi ${map.customer}, you're booked in for the ${map.item} on ${map.start}. ${map.paymentnote} Questions? ${map.phone}. Sussex Van & Trailer Hire`;
  if (key === 'reminder') return `Hi ${map.customer}, reminder: your ${map.item} hire is due back ${map.end}. Please return it swept out & on time so we can refund your deposit. Sussex Van & Trailer Hire`;
  return null;
}
function toE164(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+44' + p.slice(1);   // UK mobile
  if (p.startsWith('44')) return '+' + p;
  return p;
}
async function sendBookingSms(key, booking) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return;                // SMS off until Twilio is configured
  const to = toE164(booking.customer && booking.customer.phone);
  if (!to) return;
  const { map } = await buildMap(booking);
  const text = smsText(key, map);
  if (!text) return;
  const body = new URLSearchParams({ To: to, From: from, Body: text });
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
}

// ---------- ADMIN notification (new booking request) ----------
async function sendAdminNotification(booking) {
  if (!process.env.RESEND_API_KEY) { console.log('[admin] SKIP: no RESEND_API_KEY'); return; }
  // alert EVERY admin account; fall back to NOTIFY_EMAIL if none found
  const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
  let to = (admins || []).map((a) => a.email).filter(Boolean);
  if (!to.length && process.env.NOTIFY_EMAIL) to = [process.env.NOTIFY_EMAIL];
  if (!to.length) { console.log('[admin] SKIP: no admin emails found'); return; }
  const { map } = await buildMap(booking);
  const single = booking.start_date === booking.end_date;
  const subject = `New booking request — ${map.item} (${map.start})`;
  const text = `New booking request received:\n\n`
    + `Item: ${map.item}\n`
    + `Dates: ${map.start}${single ? '' : ' → ' + map.end} (${map.period})\n`
    + `Customer: ${map.customer}\n`
    + `Phone: ${(booking.customer && booking.customer.phone) || '—'}\n`
    + `Email: ${map.email}\n`
    + `Payment: ${booking.payment_method}\n`
    + `Fulfilment: ${booking.fulfilment}\n`
    + `Notes: ${booking.notes || '—'}\n\n`
    + `Log in to the admin panel to approve or decline it.`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text })
  });
  const t = await resp.text();
  console.log(`[admin] to=${to} resend_status=${resp.status} resend_body=${t.slice(0, 300)}`);
}

module.exports = { sendBookingEmail, sendBookingSms, sendAdminNotification, render };
