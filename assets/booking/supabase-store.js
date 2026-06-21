/* ============================================================
   Sussex Van & Trailer Hire — LIVE data layer (Supabase)
   ------------------------------------------------------------
   Drop-in replacement for the prototype store.js. It keeps the
   same synchronous read API the React screens expect by holding
   an in-memory cache that is hydrated from Supabase on load and
   after every change. Writes are sent to Supabase and the cache
   re-synced. Auth (login/signup/logout) is async.

   Requires, before this file:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script>window.SUPABASE_URL=...; window.SUPABASE_ANON_KEY=...;</script>
   ============================================================ */
(function () {
  'use strict';
  var sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  /* ---------- date helpers (identical to prototype) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function todayYmd() { return ymd(new Date()); }
  function datesBetween(a, b) { var o = [], c = a; while (c <= b) { o.push(c); c = addDays(c, 1); } return o; }
  function prettyDate(s) { return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function shortDate(s) { return parseYmd(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function rand() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function uid(p) { return (p || 'id') + '_' + rand(); }

  /* ---------- in-memory cache ---------- */
  var db = { listings: [], bookings: [], submissions: [], gallery: [], users: [], busy: [], settings: null };
  var session = null;

  /* ---------- change subscription ---------- */
  var listeners = [];
  function fire() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (l) { return l !== fn; }); }; }

  /* ---------- row mappers (snake_case DB <-> camelCase UI) ---------- */
  function fromListing(r) { return { id: r.id, category: r.category, name: r.name, blurb: r.blurb, description: r.description, specs: r.specs || {}, electrics: r.electrics, fullDay: r.full_day, halfDay: r.half_day, deposit: r.deposit, photos: r.photos || [], available: r.available, blocked: r.blocked || [], sort: r.sort }; }
  function toListingRow(l) { return { category: l.category, name: l.name, blurb: l.blurb, description: l.description, specs: l.specs || {}, electrics: l.electrics || null, full_day: l.fullDay, half_day: l.halfDay, deposit: l.deposit, photos: l.photos || [], available: l.available !== false, blocked: l.blocked || [], sort: l.sort || 0 }; }
  function fromBooking(b) { return { id: b.id, listingId: b.listing_id, userId: b.user_id, startDate: b.start_date, endDate: b.end_date, period: b.period, customer: b.customer || {}, towing: b.towing, towingReg: b.towing_reg, plateWanted: b.plate_wanted, electrics: b.electrics, licence: b.licence, fulfilment: b.fulfilment, paymentMethod: b.payment_method, notes: b.notes, price: b.price, deposit: b.deposit, deliveryPrice: b.delivery_price || 0, status: b.status, createdAt: b.created_at ? new Date(b.created_at).getTime() : Date.now(), updatedAt: b.updated_at ? new Date(b.updated_at).getTime() : 0 }; }
  function toBookingRow(d, userId) { return { listing_id: d.listingId, user_id: userId, start_date: d.startDate, end_date: d.endDate, period: d.period, customer: d.customer || {}, towing: d.towing || null, towing_reg: d.towingReg || null, plate_wanted: !!d.plateWanted, electrics: d.electrics || null, licence: d.licence || null, fulfilment: d.fulfilment || 'collection', payment_method: d.paymentMethod || 'card', notes: d.notes || null, price: d.price, deposit: d.deposit }; }
  function bookingPatchToRow(patch) {
    var map = { startDate: 'start_date', endDate: 'end_date', period: 'period', price: 'price', deposit: 'deposit', deliveryPrice: 'delivery_price', adminMessage: 'admin_message', cancelledBy: 'cancelled_by' };
    var row = {}; Object.keys(patch || {}).forEach(function (k) { if (map[k]) row[map[k]] = patch[k]; });
    return row;
  }
  function fromSub(s) { return { id: s.id, userId: s.user_id, userName: s.user_name, anonymous: s.anonymous, listingId: s.listing_id, listingName: s.listing_name, rating: s.rating, text: s.body, photos: s.photos || [], status: s.status, createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(), updatedAt: s.updated_at ? new Date(s.updated_at).getTime() : 0 }; }
  function fromProfile(p) { return { id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now() }; }

  /* ---------- hydration ---------- */
  async function loadProfile(id) {
    var r = await sb.from('profiles').select('*').eq('id', id).single();
    session = r.data ? fromProfile(r.data) : null;
  }
  async function hydrate() {
    var isAdmin = session && session.role === 'admin';
    var res = await Promise.all([
      sb.from('listings').select('*').order('sort'),
      sb.from('gallery').select('*').order('sort'),
      sb.from('settings').select('*').eq('id', 1).single(),
      sb.rpc('all_busy_slots'),
      sb.from('submissions').select('*').order('created_at', { ascending: false }),
      session ? sb.from('bookings').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      isAdmin ? sb.from('profiles').select('*').order('created_at') : Promise.resolve({ data: [] })
    ]);
    db.listings = (res[0].data || []).map(fromListing);
    db.gallery = (res[1].data || []).map(function (g) { return g.url; });
    db.settings = res[2].data || { phone: '', templates: {} };
    db.busy = (res[3].data || []).map(function (x) { return { id: x.id, listingId: x.listing_id, startDate: x.start_date, endDate: x.end_date, period: x.period }; });
    db.submissions = (res[4].data || []).map(fromSub);
    db.bookings = (res[5].data || []).map(fromBooking);
    db.users = isAdmin ? (res[6].data || []).map(fromProfile) : (session ? [session] : []);
  }
  async function init() {
    var s = await sb.auth.getSession();
    if (s.data && s.data.session) await loadProfile(s.data.session.user.id);
    await hydrate();
  }
  // background write: run the promise, log errors, then re-sync the cache
  function bg(p) { Promise.resolve(p).then(function (r) { if (r && r.error) console.error('[Store]', r.error); return hydrate(); }).then(fire).catch(function (e) { console.error('[Store]', e); }); }

  /* ---------- auth ---------- */
  function currentUser() { return session; }
  async function login(email, password) {
    var r = await sb.auth.signInWithPassword({ email: (email || '').trim().toLowerCase(), password: password });
    if (r.error) return { error: 'Email or password is incorrect.' };
    await loadProfile(r.data.user.id); await hydrate(); fire();
    return { user: session };
  }
  async function signup(data) {
    var email = (data.email || '').trim().toLowerCase();
    if (!email || !data.password || !data.name) return { error: 'Please fill in your name, email and password.' };
    var r = await sb.auth.signUp({ email: email, password: data.password, options: { data: { name: data.name.trim(), phone: (data.phone || '').trim() } } });
    if (r.error) return { error: r.error.message };
    if (!r.data.session) return { pending: true, message: 'Almost there! We\u2019ve emailed a confirmation link to ' + email + '. Click it to verify your address, then sign in here.' };
    await loadProfile(r.data.user.id); await hydrate(); fire();
    return { user: session };
  }
  function logout() { session = null; db.bookings = []; db.users = []; fire(); sb.auth.signOut().then(hydrate).then(fire); }

  /* ---------- listings ---------- */
  function listings() { return db.listings.slice(); }
  function getListing(id) { return db.listings.find(function (l) { return l.id === id; }) || null; }
  function saveListing(listing) {
    var existing = db.listings.find(function (l) { return l.id === listing.id; });
    if (existing) { Object.assign(existing, listing); fire(); bg(sb.from('listings').update(toListingRow(listing)).eq('id', listing.id)); }
    else { var temp = Object.assign({}, listing, { id: uid('l') }); db.listings.push(temp); fire(); bg(sb.from('listings').insert(toListingRow(listing))); }
    return listing;
  }
  function deleteListing(id) { db.listings = db.listings.filter(function (l) { return l.id !== id; }); db.bookings = db.bookings.filter(function (b) { return b.listingId !== id; }); fire(); bg(sb.from('listings').delete().eq('id', id)); }

  /* ---------- availability (reads db.busy — non-personal, public) ---------- */
  function occupiedCells(listingId, ignoreBookingId) {
    var cells = {};
    var l = getListing(listingId);
    if (l && l.blocked) l.blocked.forEach(function (d) { cells[d + '|am'] = true; cells[d + '|pm'] = true; });
    db.busy.forEach(function (b) {
      if (b.listingId !== listingId || b.id === ignoreBookingId) return;
      var days = datesBetween(b.startDate, b.endDate);
      days.forEach(function (d) {
        var single = days.length === 1;
        if (single && b.period !== 'full') cells[d + '|' + b.period] = true;
        else { cells[d + '|am'] = true; cells[d + '|pm'] = true; }
      });
    });
    return cells;
  }
  function dayStatus(listingId, dateStr, ignoreId) {
    var c = occupiedCells(listingId, ignoreId), am = c[dateStr + '|am'], pm = c[dateStr + '|pm'];
    if (!am && !pm) return 'free'; if (am && pm) return 'booked'; return am ? 'pm' : 'am';
  }
  function isRangeAvailable(listingId, startDate, endDate, period, ignoreId) {
    var days = datesBetween(startDate, endDate), c = occupiedCells(listingId, ignoreId);
    if (days.length === 1) return period === 'full' ? (!c[startDate + '|am'] && !c[startDate + '|pm']) : !c[startDate + '|' + period];
    return days.every(function (d) { return !c[d + '|am'] && !c[d + '|pm']; });
  }
  function priceFor(listing, startDate, endDate, period) { var days = datesBetween(startDate, endDate); return days.length === 1 ? (period === 'full' ? listing.fullDay : listing.halfDay) : days.length * listing.fullDay; }

  /* ---------- bookings ---------- */
  function bookings() { return db.bookings.slice(); }
  function bookingsForUser(userId) { return db.bookings.filter(function (b) { return b.userId === userId; }); }
  function createBooking(data) {
    if (!isRangeAvailable(data.listingId, data.startDate, data.endDate, data.period)) return { error: 'Sorry — those dates have just been taken. Please pick another slot.' };
    var temp = Object.assign({ id: uid('bk'), status: 'pending', createdAt: Date.now() }, data);
    db.bookings.unshift(temp);
    db.busy.push({ id: temp.id, listingId: data.listingId, startDate: data.startDate, endDate: data.endDate, period: data.period });
    fire();
    bg(sb.from('bookings').insert(toBookingRow(data, session ? session.id : data.userId)));
    return { booking: temp };
  }
  function setBookingStatus(id, status, patch) {
    var b = db.bookings.find(function (x) { return x.id === id; });
    if (b) { b.status = status; if (patch) Object.assign(b, patch); }
    if (status === 'cancelled' || status === 'declined') db.busy = db.busy.filter(function (x) { return x.id !== id; });
    fire();
    var row = Object.assign({ status: status, updated_at: new Date().toISOString() }, bookingPatchToRow(patch));
    bg(sb.from('bookings').update(row).eq('id', id));
  }

  /* ---------- submissions ---------- */
  function submissions() { return db.submissions.slice(); }
  function submissionsForUser(userId) { return db.submissions.filter(function (s) { return s.userId === userId; }); }
  function approvedReviews() { return db.submissions.filter(function (s) { return s.status === 'approved' && s.text; }).sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); }); }
  function createSubmission(data) {
    if (!data.text && !(data.photos && data.photos.length)) return { error: 'Please add a few words or at least one photo.' };
    var temp = Object.assign({ id: uid('sub'), status: 'pending', createdAt: Date.now() }, data);
    db.submissions.unshift(temp); fire();
    var row = { user_id: session ? session.id : null, user_name: data.userName, anonymous: !!data.anonymous, listing_id: data.listingId || null, listing_name: data.listingName, rating: data.rating, body: data.text, photos: data.photos || [] };
    bg(sb.from('submissions').insert(row));
    return { submission: temp };
  }
  function setSubmissionStatus(id, status) {
    var s = db.submissions.find(function (x) { return x.id === id; });
    if (s) { s.status = status; if (status === 'approved' && s.photos) s.photos.forEach(function (p) { if (db.gallery.indexOf(p) === -1) db.gallery.unshift(p); }); fire(); }
    bg((async function () {
      await sb.from('submissions').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
      if (status === 'approved' && s && s.photos) for (var i = 0; i < s.photos.length; i++) await sb.from('gallery').insert({ url: s.photos[i], sort: -Date.now() - i });
    })());
  }

  /* ---------- gallery ---------- */
  function gallery() { return db.gallery.slice(); }
  function addGalleryPhoto(url) { db.gallery.unshift(url); fire(); bg(sb.from('gallery').insert({ url: url, sort: -Date.now() })); }
  function removeGalleryPhoto(src) { db.gallery = db.gallery.filter(function (g) { return g !== src; }); fire(); bg(sb.from('gallery').delete().eq('url', src)); }
  function setGallery(arr) { db.gallery = arr.slice(); fire(); bg((async function () { for (var i = 0; i < arr.length; i++) await sb.from('gallery').update({ sort: i }).eq('url', arr[i]); })()); }

  /* ---------- stats ---------- */
  function stats() {
    return {
      pending: db.bookings.filter(function (b) { return b.status === 'pending'; }).length,
      awaitingPayment: db.bookings.filter(function (b) { return b.status === 'approved'; }).length,
      confirmed: db.bookings.filter(function (b) { return b.status === 'paid'; }).length,
      listings: db.listings.length,
      customers: db.users.filter(function (u) { return u.role === 'customer'; }).length,
      pendingReviews: db.submissions.filter(function (s) { return s.status === 'pending'; }).length
    };
  }

  /* ---------- users (admin) ---------- */
  function allUsers() { return db.users.slice(); }
  function updateUser(id, patch) {
    var u = db.users.find(function (x) { return x.id === id; });
    if (u) Object.assign(u, patch);
    if (session && session.id === id) Object.assign(session, patch);
    fire();
    bg(sb.from('profiles').update(patch).eq('id', id));
    return { user: u || patch };
  }
  async function sendPasswordReset(id) {
    var u = db.users.find(function (x) { return x.id === id; });
    if (!u) return { error: 'User not found.' };
    var r = await sb.auth.resetPasswordForEmail(u.email);
    if (r.error) return { error: r.error.message };
    return { email: u.email };
  }
  async function changePassword(id, currentPw, newPw) {
    if (!session) return { error: 'You are not signed in.' };
    if (!newPw || newPw.length < 4) return { error: 'New password must be at least 4 characters.' };
    var v = await sb.auth.signInWithPassword({ email: session.email, password: currentPw });
    if (v.error) return { error: 'Your current password is incorrect.' };
    var r = await sb.auth.updateUser({ password: newPw });
    if (r.error) return { error: r.error.message };
    return { ok: true };
  }
  async function adminCreateUser(data) {
    var email = (data.email || '').trim().toLowerCase();
    if (!data.name || !email || !data.password) return { error: 'Name, email and password are required.' };
    // secondary client with no session persistence, so the admin stays logged in
    var tmp = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    var r = await tmp.auth.signUp({ email: email, password: data.password, options: { data: { name: data.name.trim(), phone: (data.phone || '').trim() } } });
    if (r.error) return { error: r.error.message };
    if (data.role === 'admin' && r.data && r.data.user) await sb.from('profiles').update({ role: 'admin' }).eq('id', r.data.user.id);
    await hydrate(); fire();
    return { user: { id: r.data.user && r.data.user.id, name: data.name, email: email, role: data.role === 'admin' ? 'admin' : 'customer' } };
  }

  /* ---------- settings / email templates ---------- */
  function getSettings() { return db.settings || { phone: '', templates: {} }; }
  function saveTemplate(key, data) { var s = getSettings(); s.templates = s.templates || {}; s.templates[key] = data; fire(); bg(sb.from('settings').update({ templates: s.templates }).eq('id', 1)); }
  function renderTemplate(key, booking) {
    var s = getSettings();
    var tpl = (s.templates && s.templates[key]) || { subject: '', body: '' };
    var l = getListing(booking.listingId) || { name: 'your item' };
    var single = booking.startDate === booking.endDate;
    var period = single ? (booking.period === 'full' ? 'full day' : booking.period === 'am' ? 'morning' : 'afternoon') : (datesBetween(booking.startDate, booking.endDate).length + ' days');
    var delivery = booking.deliveryPrice || 0;
    var total = (booking.price || 0) + (booking.deposit || 0) + delivery;
    var deliveryLine = booking.fulfilment === 'delivery' ? (delivery ? 'Delivery: £' + delivery + '.' : 'Delivery: we’ll confirm the cost.') : '';
    var paymentnote = booking.paymentMethod === 'cash'
      ? 'Please bring £' + total + ' in cash to collection' + (delivery ? '/delivery' : '') + ' — that’s £' + booking.price + ' hire' + (delivery ? ', £' + delivery + ' delivery' : '') + ' plus a £' + booking.deposit + ' refundable deposit.'
      : 'Your refundable deposit of £' + booking.deposit + ' has been received — thank you. The £' + booking.price + ' hire' + (delivery ? ' plus £' + delivery + ' delivery' : '') + ' is due at collection.';
    var map = {
      customer: (booking.customer && booking.customer.name) || 'there', item: l.name,
      start: prettyDate(booking.startDate), end: prettyDate(booking.endDate), period: period,
      price: booking.price, deposit: booking.deposit, total: total,
      delivery: delivery ? ('£' + delivery) : 'TBC', deliverynote: deliveryLine, paymentnote: paymentnote,
      paylink: 'https://pay.sussexvanandtrailerhire.co.uk/b/' + (booking.id || 'xxxx'),
      phone: s.phone, email: (booking.customer && booking.customer.email) || '',
      fulfilment: booking.fulfilment === 'delivery' ? 'Delivery requested — we’ll confirm a time' : 'Collection from our Rustington yard'
    };
    function fill(str) { return String(str).replace(/\{\{(\w+)\}\}/g, function (m, k) { return (map[k] !== undefined ? map[k] : m); }); }
    return { subject: fill(tpl.subject), body: fill(tpl.body) };
  }

  function resetAll() { hydrate().then(fire); }

  /* ---------- expose (same surface as the prototype store) ---------- */
  window.Store = {
    init: init,
    ymd: ymd, parseYmd: parseYmd, addDays: addDays, todayYmd: todayYmd, datesBetween: datesBetween, prettyDate: prettyDate, shortDate: shortDate, uid: uid,
    currentUser: currentUser, signup: signup, login: login, logout: logout,
    listings: listings, getListing: getListing, saveListing: saveListing, deleteListing: deleteListing,
    dayStatus: dayStatus, isRangeAvailable: isRangeAvailable, priceFor: priceFor, occupiedCells: occupiedCells,
    bookings: bookings, bookingsForUser: bookingsForUser, createBooking: createBooking, setBookingStatus: setBookingStatus,
    gallery: gallery, addGalleryPhoto: addGalleryPhoto, removeGalleryPhoto: removeGalleryPhoto, setGallery: setGallery,
    submissions: submissions, submissionsForUser: submissionsForUser, createSubmission: createSubmission, setSubmissionStatus: setSubmissionStatus, approvedReviews: approvedReviews,
    stats: stats, subscribe: subscribe, resetAll: resetAll,
    getSettings: getSettings, saveTemplate: saveTemplate, renderTemplate: renderTemplate,
    updateUser: updateUser, sendPasswordReset: sendPasswordReset, changePassword: changePassword, setGallery: setGallery, adminCreateUser: adminCreateUser,
    allUsers: allUsers
  };
})();
