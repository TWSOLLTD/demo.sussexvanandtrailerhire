// ============================================================
// Shared email helper (Resend). Renders the admin-editable
// template from the `settings` table and sends it.
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function fmtDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

async function render(key, booking) {
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const tpl = (settings.templates && settings.templates[key]) || { subject: '', body: '' };
  const { data: listing } = await supabase.from('listings').select('name').eq('id', booking.listing_id).single();
  const single = booking.start_date === booking.end_date;
  const total = (booking.price || 0) + (booking.deposit || 0);
  const cash = booking.payment_method === 'cash';
  const map = {
    customer: booking.customer?.name || 'there',
    item: listing?.name || 'your item',
    start: fmtDate(booking.start_date),
    end: fmtDate(booking.end_date),
    period: single ? booking.period : 'multiple days',
    price: booking.price, deposit: booking.deposit, total,
    paymentnote: cash
      ? `Please bring £${total} in cash to collection — that's £${booking.price} hire plus a £${booking.deposit} refundable deposit.`
      : `Your refundable deposit of £${booking.deposit} has been received. The £${booking.price} hire balance is due at collection.`,
    paylink: booking.pay_url || 'https://pay.sussexvanandtrailerhire.co.uk/',
    phone: settings.phone, email: booking.customer?.email || '',
    fulfilment: booking.fulfilment === 'delivery' ? 'Delivery requested — we\u2019ll confirm a time' : 'Collection from our Rustington yard'
  };
  const fill = (str) => String(str).replace(/\{\{(\w+)\}\}/g, (m, k) => (map[k] !== undefined ? map[k] : m));
  return { subject: fill(tpl.subject), body: fill(tpl.body), to: booking.customer?.email };
}

async function sendBookingEmail(key, booking) {
  const r = await render(key, booking);
  if (!r.to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sussex Van & Trailer Hire <bookings@sussexvanandtrailerhire.co.uk>',
      to: r.to, subject: r.subject,
      text: r.body
    })
  });
}

module.exports = { sendBookingEmail, render };
