// ============================================================
// Shared messaging helper — renders the admin-editable template
// from the `settings` table, wraps it in a branded HTML shell,
// and sends by EMAIL (Resend) + optional SMS (Twilio).
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || 'Sussex Van & Trailer Hire <bookings@sussexvanandtrailerhire.co.uk>';
const SITE = process.env.SITE_URL || 'https://demo.sussexvanandtrailerhire.co.uk';

// brand colours
const NAVY = '#0d2148', ORANGE = '#e0531f', INK = '#1c2733', MUTE = '#6a7785';

function fmtDate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ---------- branded HTML shell ----------
function brandedHtml(opts) {
  const heading = opts.heading
    ? `<h1 style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.25;color:${NAVY};font-weight:800;">${esc(opts.heading)}</h1>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(13,33,72,.10);">
<tr><td style="background:${NAVY};padding:24px 30px;font-family:Arial,Helvetica,sans-serif;">
<div style="font-size:21px;font-weight:800;letter-spacing:.04em;color:#ffffff;text-transform:uppercase;">SUSSEX <span style="color:${ORANGE};">VAN &amp; TRAILER</span> HIRE</div>
<div style="font-size:11px;letter-spacing:.18em;color:#9fb0c4;text-transform:uppercase;margin-top:6px;">Trailer &amp; Van Hire &middot; Vehicle Transport &middot; Rustington</div>
</td></tr>
<tr><td style="height:4px;background:${ORANGE};font-size:0;line-height:4px;">&nbsp;</td></tr>
<tr><td style="padding:32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">${heading}${opts.bodyHtml}</td></tr>
<tr><td style="background:#f3f5f8;border-top:1px solid #e5e9ee;padding:22px 30px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:${MUTE};">
<strong style="color:${NAVY};">Sussex Van &amp; Trailer Hire</strong><br>Rustington &amp; Littlehampton, West Sussex<br>
<a href="tel:+447378152002" style="color:${ORANGE};text-decoration:none;font-weight:700;">07378 152002</a> &nbsp;&middot;&nbsp; <a href="${SITE}" style="color:${ORANGE};text-decoration:none;">sussexvanandtrailerhire.co.uk</a>
</td></tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9aa7b4;margin-top:14px;">Straps &amp; number plates included &middot; Discounts for longer hire</div>
</td></tr></table></body></html>`;
}
function textToHtml(text) {
  return esc(text)
    .replace(/(https?:\/\/[^\s]+)/g, (u) => `<a href="${u}" style="color:${ORANGE};word-break:break-all;">${u}</a>`)
    .split(/\n\n+/).map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
}
function detailsTable(rows) {
  const trs = rows.filter((r) => r[1] != null && r[1] !== '').map(([k, v]) =>
    `<tr><td style="padding:8px 0;color:${MUTE};font-size:13px;width:128px;vertical-align:top;">${esc(k)}</td><td style="padding:8px 0;color:${INK};font-size:14.5px;font-weight:600;">${esc(v)}</td></tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e9edf2;border-bottom:1px solid #e9edf2;margin:8px 0 22px;">${trs}</table>`;
}
function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td style="background:${ORANGE};border-radius:8px;">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(label)}</a></td></tr></table>`;
}

// build the merge map; email + SMS both use it
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
  return { subject: fill(tpl.subject, map), body: fill(tpl.body, map), to: (booking.customer && booking.customer.email), map };
}

// low-level Resend send (html + plain-text fallback)
async function send(to, subject, html, text, tag) {
  if (!process.env.RESEND_API_KEY) { console.log(`[${tag}] SKIP: no RESEND_API_KEY`); return; }
  if (!to || (Array.isArray(to) && !to.length)) { console.log(`[${tag}] SKIP: no recipient`); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text })
  });
  const t = await resp.text();
  console.log(`[${tag}] to=${Array.isArray(to) ? to.join(',') : to} resend_status=${resp.status} resend_body=${t.slice(0, 300)}`);
  return { status: resp.status, body: t };
}

// ---------- customer status emails (approval / confirmation / reminder / declined) ----------
async function sendBookingEmail(key, booking) {
  const r = await render(key, booking);
  if (!r.to) { console.log('[email] SKIP: booking has no customer email', booking.id); return; }
  let bodyHtml = textToHtml(r.body);
  if (key === 'approval' && r.map.paylink) bodyHtml += button('Pay your deposit', r.map.paylink);
  const html = brandedHtml({ bodyHtml });
  return send(r.to, r.subject, html, r.body, 'email');
}

// ---------- customer "request received" (on new booking) ----------
async function sendRequestReceived(booking) {
  const to = booking.customer && booking.customer.email;
  if (!to) { console.log('[request] SKIP: no customer email'); return; }
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const subject = `We\u2019ve got your request — ${map.item} (${map.start})`;
  const bodyHtml =
    `<p style="margin:0 0 14px;">Hi ${esc(map.customer)},</p>`
    + `<p style="margin:0 0 14px;">Thanks for your request to hire the <strong>${esc(map.item)}</strong>. We\u2019ve received it and we\u2019re checking availability — you\u2019ll get another email the moment it\u2019s approved.</p>`
    + detailsTable([
      ['Item', map.item],
      ['Dates', dates],
      ['Hire', `£${map.price}`],
      ['Deposit', `£${map.deposit} (refundable)`],
      ['Payment', booking.payment_method === 'cash' ? 'Cash on collection' : 'Card — pay link after approval'],
      ['Collection', booking.fulfilment === 'delivery' ? 'Delivery requested' : 'Collect from Rustington']
    ])
    + `<p style="margin:0;color:${MUTE};font-size:13.5px;">Nothing is confirmed or charged yet — this is just to confirm we\u2019ve got it. Any questions, call or text <a href="tel:+447378152002" style="color:${ORANGE};text-decoration:none;">${esc(map.phone)}</a>.</p>`;
  const text = `Hi ${map.customer},\n\nThanks for your request to hire the ${map.item}. We've received it and we're checking availability — you'll get another email the moment it's approved.\n\nItem: ${map.item}\nDates: ${dates}\nHire: £${map.price}  ·  Deposit: £${map.deposit} (refundable)\n\nNothing is confirmed or charged yet. Any questions, call or text ${map.phone}.\n\nSussex Van & Trailer Hire`;
  return send(to, subject, brandedHtml({ heading: 'Request received', bodyHtml }), text, 'request');
}

// ---------- admin notification (new booking request) ----------
async function sendAdminNotification(booking) {
  const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
  let to = (admins || []).map((a) => a.email).filter(Boolean);
  if (!to.length && process.env.NOTIFY_EMAIL) to = [process.env.NOTIFY_EMAIL];
  if (!to.length) { console.log('[admin] SKIP: no admin emails found'); return; }
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const subject = `New booking request — ${map.item} (${map.start})`;
  const bodyHtml =
    `<p style="margin:0 0 18px;">A new booking request has just come in:</p>`
    + detailsTable([
      ['Item', map.item],
      ['Dates', `${dates} (${map.period})`],
      ['Customer', map.customer],
      ['Phone', (booking.customer && booking.customer.phone) || '—'],
      ['Email', map.email],
      ['Payment', booking.payment_method === 'cash' ? 'Cash on collection' : 'Card'],
      ['Fulfilment', booking.fulfilment === 'delivery' ? 'Delivery requested' : 'Collection'],
      ['Notes', booking.notes || '—']
    ])
    + button('Review & approve', SITE + '/app');
  const text = `New booking request:\n\nItem: ${map.item}\nDates: ${dates} (${map.period})\nCustomer: ${map.customer}\nPhone: ${(booking.customer && booking.customer.phone) || '—'}\nEmail: ${map.email}\nPayment: ${booking.payment_method}\nFulfilment: ${booking.fulfilment}\nNotes: ${booking.notes || '—'}\n\nLog in to the admin panel to approve or decline.`;
  return send(to, subject, brandedHtml({ heading: 'New booking request', bodyHtml }), text, 'admin');
}

// ---------- SMS (Twilio) ----------
function smsText(key, map) {
  if (key === 'approval') return `Hi ${map.customer}, your ${map.item} hire (${map.start}) is approved! Secure it by paying your £${map.deposit} deposit: ${map.paylink} — Sussex Van & Trailer Hire`;
  if (key === 'confirmation') return `Hi ${map.customer}, you're booked in for the ${map.item} on ${map.start}. ${map.paymentnote} Questions? ${map.phone}. Sussex Van & Trailer Hire`;
  if (key === 'reminder') return `Hi ${map.customer}, reminder: your ${map.item} hire is due back ${map.end}. Please return it swept out & on time so we can refund your deposit. Sussex Van & Trailer Hire`;
  return null;
}
function toE164(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+44' + p.slice(1);
  if (p.startsWith('44')) return '+' + p;
  return p;
}
async function sendBookingSms(key, booking) {
  const sid = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN, from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return;
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

// ---------- declined (admin declined a pending request, with reason) ----------
async function sendDeclined(booking) {
  const to = booking.customer && booking.customer.email;
  if (!to) { console.log('[declined] SKIP: no email'); return; }
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const reason = booking.admin_message;
  const reasonHtml = reason ? `<p style="margin:0 0 16px;padding:14px 16px;background:#f7f3ee;border-left:3px solid ${ORANGE};border-radius:4px;"><strong>Reason:</strong> ${esc(reason)}</p>` : '';
  const bodyHtml =
    `<p style="margin:0 0 14px;">Hi ${esc(map.customer)},</p>`
    + `<p style="margin:0 0 14px;">Thanks for your interest in hiring the <strong>${esc(map.item)}</strong> for ${esc(dates)}. Unfortunately we\u2019re not able to confirm this one.</p>`
    + reasonHtml
    + `<p style="margin:0 0 14px;">Do get in touch if you\u2019d like to look at other dates or vehicles — we\u2019re happy to help.</p>`
    + `<p style="margin:0;color:${MUTE};font-size:13.5px;">Call or text us on <a href="tel:+447378152002" style="color:${ORANGE};text-decoration:none;">${esc(map.phone)}</a>.</p>`;
  const text = `Hi ${map.customer},\n\nThanks for your interest in hiring the ${map.item} for ${dates}. Unfortunately we're not able to confirm this one.\n${reason ? '\nReason: ' + reason + '\n' : ''}\nDo get in touch if you'd like other dates or vehicles — we're happy to help.\n\nCall or text ${map.phone}.\n\nSussex Van & Trailer Hire`;
  return send(to, subject(`Update on your booking request — ${map.item}`), brandedHtml({ heading: 'Booking not confirmed', bodyHtml }), text, 'declined');
}

// ---------- cancelled by admin (reason optional) ----------
async function sendCancelledByAdmin(booking) {
  const to = booking.customer && booking.customer.email;
  if (!to) { console.log('[cancelled] SKIP: no email'); return; }
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const reason = booking.admin_message;
  const reasonHtml = reason ? `<p style="margin:0 0 16px;padding:14px 16px;background:#f7f3ee;border-left:3px solid ${ORANGE};border-radius:4px;"><strong>Reason:</strong> ${esc(reason)}</p>` : '';
  const bodyHtml =
    `<p style="margin:0 0 14px;">Hi ${esc(map.customer)},</p>`
    + `<p style="margin:0 0 14px;">We\u2019re sorry to let you know that your booking for the <strong>${esc(map.item)}</strong> (${esc(dates)}) has been cancelled.</p>`
    + reasonHtml
    + `<p style="margin:0 0 14px;">If you\u2019ve paid a deposit, it will be refunded in full. Please get in touch if you\u2019d like to rebook or have any questions.</p>`
    + `<p style="margin:0;color:${MUTE};font-size:13.5px;">Call or text us on <a href="tel:+447378152002" style="color:${ORANGE};text-decoration:none;">${esc(map.phone)}</a>.</p>`;
  const text = `Hi ${map.customer},\n\nWe're sorry to let you know that your booking for the ${map.item} (${dates}) has been cancelled.\n${reason ? '\nReason: ' + reason + '\n' : ''}\nIf you've paid a deposit, it will be refunded in full. Get in touch to rebook.\n\nCall or text ${map.phone}.\n\nSussex Van & Trailer Hire`;
  return send(to, subject(`Your booking has been cancelled — ${map.item} (${map.start})`), brandedHtml({ heading: 'Booking cancelled', bodyHtml }), text, 'cancelled');
}

// ---------- cancellation confirmed (customer cancelled their own) ----------
async function sendCancellationConfirmed(booking) {
  const to = booking.customer && booking.customer.email;
  if (!to) { console.log('[cancel-confirm] SKIP: no email'); return; }
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const bodyHtml =
    `<p style="margin:0 0 14px;">Hi ${esc(map.customer)},</p>`
    + `<p style="margin:0 0 14px;">This confirms you\u2019ve cancelled your booking for the <strong>${esc(map.item)}</strong> (${esc(dates)}). No problem at all.</p>`
    + `<p style="margin:0 0 14px;">If you paid a deposit it will be refunded. Fancy another date? You can book again any time.</p>`
    + button('Book again', SITE + '/app')
    + `<p style="margin:0;color:${MUTE};font-size:13.5px;">Questions? Call or text <a href="tel:+447378152002" style="color:${ORANGE};text-decoration:none;">${esc(map.phone)}</a>.</p>`;
  const text = `Hi ${map.customer},\n\nThis confirms you've cancelled your booking for the ${map.item} (${dates}). No problem at all.\n\nIf you paid a deposit it will be refunded. Book again any time at ${SITE}/app.\n\nQuestions? Call or text ${map.phone}.\n\nSussex Van & Trailer Hire`;
  return send(to, subject(`Cancellation confirmed — ${map.item} (${map.start})`), brandedHtml({ heading: 'Cancellation confirmed', bodyHtml }), text, 'cancel-confirm');
}

// ---------- notify admins a customer cancelled ----------
async function sendAdminCancelNotice(booking) {
  const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
  let to = (admins || []).map((a) => a.email).filter(Boolean);
  if (!to.length && process.env.NOTIFY_EMAIL) to = [process.env.NOTIFY_EMAIL];
  if (!to.length) return;
  const { map, single } = await buildMap(booking);
  const dates = single ? map.start : `${map.start} → ${map.end}`;
  const bodyHtml =
    `<p style="margin:0 0 18px;">A customer has cancelled their booking:</p>`
    + detailsTable([['Item', map.item], ['Dates', dates], ['Customer', map.customer], ['Phone', (booking.customer && booking.customer.phone) || '—'], ['Email', map.email]])
    + `<p style="margin:0;color:${MUTE};font-size:13.5px;">These dates are now free again in your calendar.</p>`;
  const text = `A customer has cancelled their booking.\n\nItem: ${map.item}\nDates: ${dates}\nCustomer: ${map.customer}\nEmail: ${map.email}\n\nThese dates are now free again.`;
  return send(to, subject(`Booking cancelled by customer — ${map.item} (${map.start})`), brandedHtml({ heading: 'Booking cancelled', bodyHtml }), text, 'admin-cancel');
}

function subject(s) { return s; }

module.exports = { sendBookingEmail, sendRequestReceived, sendAdminNotification, sendDeclined, sendCancelledByAdmin, sendCancellationConfirmed, sendAdminCancelNotice, sendBookingSms, render };
