/* ============================================================
   Sussex Van & Trailer Hire — REAL backend data layer (Supabase)
   ------------------------------------------------------------
   Drop-in replacement for the prototype's localStorage store.js.
   Every method returns a Promise (the backend is async). Wiring
   note: the React UI currently calls Store.x() synchronously —
   when you switch to this, make the call sites `await` (search
   for `Store.` in the jsx files). Method names match 1:1 so the
   change is mechanical.

   Requires the Supabase JS client on the page:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   and these globals set in a small inline config script:
   window.SUPABASE_URL, window.SUPABASE_ANON_KEY
   (the anon key is safe to expose — Row-Level Security protects data).
   ============================================================ */
(function () {
  'use strict';
  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  /* ---------- date helpers (same as prototype) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function todayYmd() { return ymd(new Date()); }
  function datesBetween(a, b) { var o = [], c = a; while (c <= b) { o.push(c); c = addDays(c, 1); } return o; }
  function prettyDate(s) { return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function shortDate(s) { return parseYmd(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  /* ---------- auth ---------- */
  async function currentUser() {
    var s = await sb.auth.getUser();
    if (!s.data || !s.data.user) return null;
    var p = await sb.from('profiles').select('*').eq('id', s.data.user.id).single();
    return p.data || null;
  }
  async function signup(data) {
    var res = await sb.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { name: data.name, phone: data.phone || '' } }
    });
    if (res.error) return { error: res.error.message };
    return { user: await currentUser() };
  }
  async function login(email, password) {
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) return { error: 'Email or password is incorrect.' };
    return { user: await currentUser() };
  }
  async function logout() { await sb.auth.signOut(); }
  function onAuthChange(fn) { return sb.auth.onAuthStateChange(fn); }

  /* ---------- listings ---------- */
  async function listings() { var r = await sb.from('listings').select('*').order('sort'); return (r.data || []).map(fromListing); }
  async function getListing(id) { var r = await sb.from('listings').select('*').eq('id', id).single(); return r.data ? fromListing(r.data) : null; }
  async function saveListing(l) {
    var row = toListing(l);
    if (l.id) { await sb.from('listings').update(row).eq('id', l.id); }
    else { await sb.from('listings').insert(row); }
  }
  async function deleteListing(id) { await sb.from('listings').delete().eq('id', id); }
  // map snake_case DB <-> camelCase UI
  function fromListing(r) { return { id: r.id, category: r.category, name: r.name, blurb: r.blurb, description: r.description, specs: r.specs || {}, electrics: r.electrics, fullDay: r.full_day, halfDay: r.half_day, deposit: r.deposit, photos: r.photos || [], available: r.available, blocked: r.blocked || [] }; }
  function toListing(l) { return { category: l.category, name: l.name, blurb: l.blurb, description: l.description, specs: l.specs || {}, electrics: l.electrics, full_day: l.fullDay, half_day: l.halfDay, deposit: l.deposit, photos: l.photos || [], available: l.available, blocked: l.blocked || [] }; }

  /* ---------- bookings + availability ---------- */
  async function bookings() { var r = await sb.from('bookings').select('*').order('created_at', { ascending: false }); return (r.data || []).map(fromBooking); }
  async function bookingsForUser(uid) { var r = await sb.from('bookings').select('*').eq('user_id', uid).order('created_at', { ascending: false }); return (r.data || []).map(fromBooking); }
  function fromBooking(b) { return { id: b.id, listingId: b.listing_id, userId: b.user_id, startDate: b.start_date, endDate: b.end_date, period: b.period, customer: b.customer, towing: b.towing, towingReg: b.towing_reg, plateWanted: b.plate_wanted, electrics: b.electrics, licence: b.licence, fulfilment: b.fulfilment, paymentMethod: b.payment_method, notes: b.notes, price: b.price, deposit: b.deposit, status: b.status, createdAt: new Date(b.created_at).getTime() }; }

  // occupied cells for a listing (server-side source of truth lives in the DB;
  // the booking insert below also re-checks to prevent races)
  async function occupiedCells(listingId, ignoreId) {
    var l = await getListing(listingId);
    var cells = {};
    if (l && l.blocked) l.blocked.forEach(function (d) { cells[d + '|am'] = cells[d + '|pm'] = true; });
    var r = await sb.from('bookings').select('*').eq('listing_id', listingId).in('status', ['pending', 'approved', 'paid']);
    (r.data || []).forEach(function (b) {
      if (b.id === ignoreId) return;
      var days = datesBetween(b.start_date, b.end_date);
      days.forEach(function (d) {
        var single = days.length === 1;
        if (!single || b.period === 'full') { cells[d + '|am'] = cells[d + '|pm'] = true; }
        else cells[d + '|' + b.period] = true;
      });
    });
    return cells;
  }
  async function dayStatus(listingId, ds, ignoreId) {
    var c = await occupiedCells(listingId, ignoreId);
    var am = c[ds + '|am'], pm = c[ds + '|pm'];
    if (!am && !pm) return 'free'; if (am && pm) return 'booked'; return am ? 'pm' : 'am';
  }
  async function isRangeAvailable(listingId, start, end, period, ignoreId) {
    var c = await occupiedCells(listingId, ignoreId);
    var days = datesBetween(start, end);
    if (days.length === 1) return period === 'full' ? (!c[start + '|am'] && !c[start + '|pm']) : !c[start + '|' + period];
    return days.every(function (d) { return !c[d + '|am'] && !c[d + '|pm']; });
  }
  function priceFor(l, start, end, period) { var days = datesBetween(start, end); return days.length === 1 ? (period === 'full' ? l.fullDay : l.halfDay) : days.length * l.fullDay; }

  async function createBooking(data) {
    if (!(await isRangeAvailable(data.listingId, data.startDate, data.endDate, data.period)))
      return { error: 'Sorry — those dates have just been taken. Please pick another slot.' };
    var row = { listing_id: data.listingId, user_id: data.userId, start_date: data.startDate, end_date: data.endDate, period: data.period, customer: data.customer, towing: data.towing, towing_reg: data.towingReg, plate_wanted: data.plateWanted, electrics: data.electrics, licence: data.licence, fulfilment: data.fulfilment, payment_method: data.paymentMethod, notes: data.notes, price: data.price, deposit: data.deposit };
    var r = await sb.from('bookings').insert(row).select().single();
    if (r.error) return { error: r.error.message };
    return { booking: fromBooking(r.data) };
  }
  // status change -> a DB trigger / Edge Function fires the matching email
  async function setBookingStatus(id, status, patch) {
    var row = Object.assign({ status: status, updated_at: new Date().toISOString() }, patch || {});
    await sb.from('bookings').update(row).eq('id', id);
  }

  /* ---------- submissions ---------- */
  async function submissions() { var r = await sb.from('submissions').select('*').order('created_at', { ascending: false }); return (r.data || []).map(fromSub); }
  async function submissionsForUser(uid) { var r = await sb.from('submissions').select('*').eq('user_id', uid).order('created_at', { ascending: false }); return (r.data || []).map(fromSub); }
  async function approvedReviews() { var r = await sb.from('submissions').select('*').eq('status', 'approved').not('body', 'is', null).order('updated_at', { ascending: false }); return (r.data || []).map(fromSub); }
  function fromSub(s) { return { id: s.id, userId: s.user_id, userName: s.user_name, anonymous: s.anonymous, listingId: s.listing_id, listingName: s.listing_name, rating: s.rating, text: s.body, photos: s.photos || [], status: s.status, createdAt: new Date(s.created_at).getTime() }; }
  async function createSubmission(d) {
    if (!d.text && !(d.photos && d.photos.length)) return { error: 'Please add a few words or at least one photo.' };
    var row = { user_id: d.userId, user_name: d.userName, anonymous: d.anonymous, listing_id: d.listingId || null, listing_name: d.listingName, rating: d.rating, body: d.text, photos: d.photos };
    var r = await sb.from('submissions').insert(row).select().single();
    if (r.error) return { error: r.error.message };
    return { submission: fromSub(r.data) };
  }
  async function setSubmissionStatus(id, status) {
    await sb.from('submissions').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
    if (status === 'approved') {
      var s = await sb.from('submissions').select('photos').eq('id', id).single();
      var photos = (s.data && s.data.photos) || [];
      for (var i = 0; i < photos.length; i++) await sb.from('gallery').insert({ url: photos[i], sort: -Date.now() });
    }
  }

  /* ---------- gallery ---------- */
  async function gallery() { var r = await sb.from('gallery').select('*').order('sort'); return (r.data || []).map(function (g) { return g.url; }); }
  async function addGalleryPhoto(url) { await sb.from('gallery').insert({ url: url, sort: -Date.now() }); }
  async function removeGalleryPhoto(url) { await sb.from('gallery').delete().eq('url', url); }
  async function setGallery(urls) { for (var i = 0; i < urls.length; i++) await sb.from('gallery').update({ sort: i }).eq('url', urls[i]); }

  /* ---------- users (admin) ---------- */
  async function allUsers() { var r = await sb.from('profiles').select('*').order('created_at'); return r.data || []; }
  async function updateUser(id, patch) { var r = await sb.from('profiles').update(patch).eq('id', id); return r.error ? { error: r.error.message } : { ok: true }; }
  async function sendPasswordReset(id) {
    var u = await sb.from('profiles').select('email').eq('id', id).single();
    if (!u.data) return { error: 'User not found.' };
    await sb.auth.resetPasswordForEmail(u.data.email);
    return { email: u.data.email };
  }
  async function changePassword(id, currentPw, newPw) {
    var r = await sb.auth.updateUser({ password: newPw }); // Supabase handles the secure update for the logged-in user
    return r.error ? { error: r.error.message } : { ok: true };
  }

  /* ---------- settings / email templates ---------- */
  async function getSettings() { var r = await sb.from('settings').select('*').eq('id', 1).single(); return r.data; }
  async function saveTemplate(key, data) {
    var s = await getSettings(); var t = s.templates || {}; t[key] = data;
    await sb.from('settings').update({ templates: t }).eq('id', 1);
  }

  /* ---------- photo upload to Supabase Storage ---------- */
  // returns a public URL; use in place of the prototype's data-URL approach
  async function uploadPhoto(bucket, file) {
    var path = Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + file.name.replace(/[^\w.-]/g, '');
    var up = await sb.storage.from(bucket).upload(path, file, { upsert: false });
    if (up.error) return { error: up.error.message };
    return { url: sb.storage.from(bucket).getPublicUrl(path).data.publicUrl };
  }

  window.Store = {
    ymd: ymd, parseYmd: parseYmd, addDays: addDays, todayYmd: todayYmd, datesBetween: datesBetween, prettyDate: prettyDate, shortDate: shortDate,
    currentUser: currentUser, signup: signup, login: login, logout: logout, onAuthChange: onAuthChange,
    listings: listings, getListing: getListing, saveListing: saveListing, deleteListing: deleteListing,
    dayStatus: dayStatus, isRangeAvailable: isRangeAvailable, priceFor: priceFor, occupiedCells: occupiedCells,
    bookings: bookings, bookingsForUser: bookingsForUser, createBooking: createBooking, setBookingStatus: setBookingStatus,
    submissions: submissions, submissionsForUser: submissionsForUser, approvedReviews: approvedReviews, createSubmission: createSubmission, setSubmissionStatus: setSubmissionStatus,
    gallery: gallery, addGalleryPhoto: addGalleryPhoto, removeGalleryPhoto: removeGalleryPhoto, setGallery: setGallery,
    allUsers: allUsers, updateUser: updateUser, sendPasswordReset: sendPasswordReset, changePassword: changePassword,
    getSettings: getSettings, saveTemplate: saveTemplate, uploadPhoto: uploadPhoto
  };
})();
