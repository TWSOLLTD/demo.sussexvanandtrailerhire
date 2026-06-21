// ============================================================
// Netlify Function: Stripe webhook
// Marks a booking paid + confirmed when its deposit payment succeeds,
// then the booking confirmation/"welcome" email is sent.
// Endpoint: /.netlify/functions/stripe-webhook  (set this URL in Stripe → Webhooks)
// Env vars (Netlify → Site settings → Environment):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// ============================================================
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { sendBookingEmail } = require('./_email');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature error: ${err.message}` };
  }

  if (evt.type === 'checkout.session.completed' || evt.type === 'payment_intent.succeeded') {
    const obj = evt.data.object;
    const bookingId = (obj.metadata && obj.metadata.booking_id) || null;
    if (bookingId) {
      // mark paid + confirmed
      const { data: booking } = await supabase
        .from('bookings')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*')
        .single();
      // fire the confirmation / welcome email
      if (booking) await sendBookingEmail('confirmation', booking);
    }
  }
  return { statusCode: 200, body: 'ok' };
};
