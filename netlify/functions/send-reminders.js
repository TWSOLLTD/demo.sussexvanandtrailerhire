// ============================================================
// Netlify Scheduled Function: end-of-hire reminders
// Runs daily (see netlify.toml schedule). Finds confirmed bookings
// ending tomorrow that haven't had a reminder yet, sends the
// "reminder" email (return steps + nudge to upload photos/review),
// and stamps reminder_sent_at so it never double-sends.
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const { sendBookingEmail, sendBookingSms } = require('./_email');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

exports.handler = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = ymd(tomorrow);

  const { data: due } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'paid')
    .eq('end_date', target)
    .is('reminder_sent_at', null);

  let sent = 0;
  for (const b of (due || [])) {
    await sendBookingEmail('reminder', b);
    await sendBookingSms('reminder', b);
    await supabase.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', b.id);
    sent++;
  }
  return { statusCode: 200, body: `Sent ${sent} reminder(s) for ${target}` };
};
