/* ============================================================
   Sussex Van & Trailer Hire — Booking data layer (PROTOTYPE)
   ------------------------------------------------------------
   This is a browser-side mock "database" backed by localStorage.
   It stands in for the real backend so the whole booking + admin
   experience works end-to-end for testing & client demos.

   In production this entire module is replaced by API calls to a
   real server (see Developer-Handoff.html). The shape of the data
   here IS the spec for the database tables.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'svth.db.v1';
  var SESSION = 'svth.session.v1';

  /* ---------- date helpers (YYYY-MM-DD keys) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function todayYmd() { return ymd(new Date()); }
  function datesBetween(start, end) { // inclusive
    var out = [], cur = start;
    while (cur <= end) { out.push(cur); cur = addDays(cur, 1); }
    return out;
  }
  function prettyDate(s) {
    var d = parseYmd(s);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function shortDate(s) {
    var d = parseYmd(s);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  /* ---------- id ---------- */
  function uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- seed data ---------- */
  function seed() {
    var now = Date.now();
    var listings = [
      {
        id: 'l_cartrans', category: 'trailer', name: 'Car Transporter',
        blurb: 'Twin-axle beavertail transporter with winch — cars, classics, projects & non-runners.',
        description: 'Our flagship beavertail car transporter. Low load angle, electric winch and a flat, full-width deck. Ideal for moving cars, classics, project vehicles and non-runners. Comes with ratchet straps and number-plate magnets. A 7-pin towing electrics and a vehicle rated to tow ~2000kg is required.',
        specs: { 'Type': 'Beavertail', 'Bed length': '4.5 m', 'Width': '2.0 m', 'Axles': 'Twin', 'Max load': '2000 kg', 'Winch': 'Electric 12V' },
        fullDay: 65, halfDay: 40, deposit: 150,
        photos: ['assets/gallery/p39.webp', 'assets/gallery/p38.webp', 'assets/gallery/p11.webp'],
        available: true, blocked: []
      },
      {
        id: 'l_flatbed', category: 'trailer', name: 'Large Flatbed',
        blurb: 'Open twin-axle flatbed, no sides — trades, removals, building materials & awkward loads.',
        description: 'Heavy-duty open flatbed with no sides to get in the way. Perfect for builders, landscapers and house moves — pallets, materials, furniture and awkward loads. Lashing points all round. Straps included.',
        specs: { 'Type': 'Flatbed', 'Bed length': '3.6 m', 'Width': '1.8 m', 'Axles': 'Twin', 'Max load': '1500 kg' },
        fullDay: 65, halfDay: 40, deposit: 150,
        photos: ['assets/gallery/p34.webp', 'assets/gallery/p18.webp'],
        available: true, blocked: []
      },
      {
        id: 'l_box', category: 'trailer', name: 'Small Box Trailer',
        blurb: 'Lockable tipping box trailer — tip runs, garden waste & house clearances.',
        description: 'A handy lockable box trailer with a tipping bed. Great for tip runs, garden waste, house clearances and general haulage. Easy to tow behind almost any car. Straps and number-plate included.',
        specs: { 'Type': 'Tipping box', 'Bed length': '2.4 m', 'Width': '1.3 m', 'Axles': 'Single', 'Max load': '750 kg', 'Lockable': 'Yes' },
        fullDay: 30, halfDay: 20, deposit: 80,
        photos: ['assets/gallery/p47.webp'],
        available: true, blocked: []
      },
      {
        id: 'l_caged', category: 'trailer', name: 'Small Caged Trailer',
        blurb: 'Mesh-sided caged trailer — bulky light loads, garden & landscaping waste.',
        description: 'Caged trailer with removable mesh sides for taller, bulky but light loads — hedge cuttings, cardboard, furniture and landscaping waste. Drop tailgate for easy loading.',
        specs: { 'Type': 'Caged', 'Bed length': '2.4 m', 'Width': '1.3 m', 'Cage height': '0.6 m', 'Axles': 'Single', 'Max load': '750 kg' },
        fullDay: 35, halfDay: 22, deposit: 80,
        photos: ['assets/gallery/p23.webp', 'assets/gallery/p25.webp'],
        available: true, blocked: []
      },
      {
        id: 'l_van_panel', category: 'van', name: 'Medium Panel Van',
        blurb: 'SWB panel van — house moves, deliveries & trade work. (Indicative — confirm spec.)',
        description: 'Clean, reliable medium panel van for self-drive hire. Ideal for house moves, deliveries and trade work. Three seats, bulkhead and ply-lined load area. Full UK driving licence and minimum age 25 required (TBC).',
        specs: { 'Type': 'Panel van', 'Load length': '2.6 m', 'Load height': '1.7 m', 'Payload': '1000 kg', 'Seats': '3', 'Fuel': 'Diesel' },
        fullDay: 70, halfDay: 45, deposit: 200,
        photos: [],
        available: true, blocked: []
      },
      {
        id: 'l_van_luton', category: 'van', name: 'Luton Box Van + Tail Lift',
        blurb: 'Luton box van with tail lift — big house moves & bulky furniture. (Indicative — confirm spec.)',
        description: 'Spacious Luton box van with a powered tail lift — the easiest way to move a whole house or bulky furniture single-handed. Huge box capacity over the cab. Full UK driving licence and minimum age 25 required (TBC).',
        specs: { 'Type': 'Luton + tail lift', 'Load length': '4.0 m', 'Load height': '2.2 m', 'Payload': '1100 kg', 'Tail lift': '500 kg', 'Fuel': 'Diesel' },
        fullDay: 85, halfDay: 55, deposit: 250,
        photos: [],
        available: true, blocked: []
      }
    ];

    // demo gallery = the marketing site photos
    var gallery = [];
    for (var i = 1; i <= 61; i++) gallery.push('assets/gallery/p' + pad(i) + '.webp');

    var adminId = 'u_admin';
    var users = [
      { id: adminId, name: 'Will Westley', email: 'admin@sussexvanandtrailerhire.co.uk', phone: '07378 152002', password: 'admin123', role: 'admin', createdAt: now },
      { id: 'u_demo', name: 'Demo Customer', email: 'demo@example.com', phone: '07700 900123', password: 'demo123', role: 'customer', createdAt: now }
    ];

    // one example pending booking so the admin inbox isn't empty on first run
    var t = todayYmd();
    var bookings = [
      {
        id: uid('bk'), listingId: 'l_cartrans', userId: 'u_demo',
        startDate: addDays(t, 3), endDate: addDays(t, 3), period: 'full',
        customer: { name: 'Demo Customer', phone: '07700 900123', email: 'demo@example.com' },
        towing: 'Land Rover Discovery 4 — 7-pin electrics', licence: 'WESTL902…  (full UK, 8 yrs)',
        fulfilment: 'collection', notes: 'Collecting a classic Mini from Chichester, returning same day.',
        price: 65, deposit: 150, status: 'pending', createdAt: now
      }
    ];

    // community submissions (customer photos + reviews, admin-moderated)
    var submissions = [
      {
        id: uid('sub'), userId: 'u_demo', userName: 'Demo Customer',
        listingId: 'l_cartrans', listingName: 'Car Transporter',
        rating: 5, text: 'Spot on service. Picked up the car transporter first thing, straps and plates all included, and Will talked me through securing the load. Made moving my project car a breeze.',
        photos: ['assets/gallery/p11.webp'], status: 'pending', createdAt: now
      }
    ];

    return { listings: listings, gallery: gallery, users: users, bookings: bookings, submissions: submissions, settings: defaultSettings(), seededAt: now };
  }

  /* ---------- default settings (admin-editable email templates) ---------- */
  function defaultSettings() {
    return {
      phone: '07378 152002',
      templates: {
        approval: {
          subject: 'Booking approved — secure it with your deposit ({{item}})',
          body: 'Hi {{customer}},\n\nGood news — your request for the {{item}} on {{start}} → {{end}} ({{period}}) has been approved!\n\nTo secure your dates, please pay your refundable deposit of £{{deposit}} using the secure link below:\n{{paylink}}\n\nWe’ll hold your dates for 48 hours. As soon as your deposit is paid we’ll send full collection instructions.\n\nAny questions, just call or text {{phone}}.\n\nSussex Van & Trailer Hire'
        },
        confirmation: {
          subject: 'You’re all booked in — {{item}} ({{start}})',
          body: 'Hi {{customer}},\n\nPayment received, thank you — your booking is now fully confirmed:\n\n• Item: {{item}}\n• Dates: {{start}} → {{end}} ({{period}})\n• Hire: £{{price}}  ·  Deposit: £{{deposit}} (refundable)\n• {{fulfilment}}\n\n{{paymentnote}}\n\nCOLLECTION\nPlease arrive at our Rustington yard at your agreed time and bring:\n  - Your driving licence (the physical card)\n  - A form of ID & proof of address\n\nWe supply ratchet straps and number-plate magnets, and we’ll make sure you’re set up to tow safely before you leave.\n\nRETURNING\nPlease return the item swept out and in the same condition by the agreed time so we can refund your deposit in full.\n\nAny questions at all, just call or text us on {{phone}}.\n\nThanks, and see you soon!\nSussex Van & Trailer Hire'
        },
        reminder: {
          subject: 'Your hire ends soon — {{item}}',
          body: 'Hi {{customer}},\n\nJust a friendly reminder that your hire of the {{item}} is due back on {{end}}.\n\nBefore you return it:\n  - Give it a quick sweep out / clean\n  - Remove your straps and any belongings\n  - Return by the agreed time so we can refund your deposit in full\n\nOne more thing — we’d love to see how you got on! Log in to your account and upload a few photos and a quick review of your trip. Approved photos may even feature in our website gallery.\n\nThanks again for choosing us,\nSussex Van & Trailer Hire · {{phone}}'
        }
      }
    };
  }

  /* ---------- persistence ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { var s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
      return JSON.parse(raw);
    } catch (e) { var s2 = seed(); return s2; }
  }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); fire(); }
  var db = load();

  /* ---------- change subscription ---------- */
  var listeners = [];
  function fire() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (l) { return l !== fn; }); }; }

  /* ---------- session / auth ---------- */
  function currentUser() {
    try {
      var id = localStorage.getItem(SESSION);
      if (!id) return null;
      return db.users.find(function (u) { return u.id === id; }) || null;
    } catch (e) { return null; }
  }
  function signup(data) {
    var email = (data.email || '').trim().toLowerCase();
    if (!email || !data.password || !data.name) return { error: 'Please fill in your name, email and password.' };
    if (db.users.some(function (u) { return u.email.toLowerCase() === email; })) return { error: 'An account with that email already exists. Try signing in.' };
    var u = { id: uid('u'), name: data.name.trim(), email: email, phone: (data.phone || '').trim(), password: data.password, role: 'customer', createdAt: Date.now() };
    db.users.push(u); save(db);
    localStorage.setItem(SESSION, u.id); fire();
    return { user: u };
  }
  function login(email, password) {
    email = (email || '').trim().toLowerCase();
    var u = db.users.find(function (x) { return x.email.toLowerCase() === email; });
    if (!u || u.password !== password) return { error: 'Email or password is incorrect.' };
    localStorage.setItem(SESSION, u.id); fire();
    return { user: u };
  }
  function logout() { localStorage.removeItem(SESSION); fire(); }

  /* ---------- listings ---------- */
  function listings() { return db.listings.slice(); }
  function getListing(id) { return db.listings.find(function (l) { return l.id === id; }) || null; }
  function saveListing(listing) {
    var idx = db.listings.findIndex(function (l) { return l.id === listing.id; });
    if (idx === -1) { listing.id = listing.id || uid('l'); db.listings.push(listing); }
    else db.listings[idx] = listing;
    save(db); return listing;
  }
  function deleteListing(id) {
    db.listings = db.listings.filter(function (l) { return l.id !== id; });
    db.bookings = db.bookings.filter(function (b) { return b.listingId !== id; });
    save(db);
  }

  /* ---------- availability ----------
     Each booking occupies date+slot cells. slot ∈ {am, pm}.
     Multi-day & full-day bookings occupy both slots on each day.
     blocked dates (maintenance) occupy both slots.
     Cancelled / declined bookings free their cells. */
  function occupiedCells(listingId, ignoreBookingId) {
    var cells = {}; // 'YYYY-MM-DD|am' -> true
    var l = getListing(listingId);
    if (l && l.blocked) l.blocked.forEach(function (d) { cells[d + '|am'] = true; cells[d + '|pm'] = true; });
    db.bookings.forEach(function (b) {
      if (b.listingId !== listingId) return;
      if (b.id === ignoreBookingId) return;
      if (b.status === 'declined' || b.status === 'cancelled') return;
      var days = datesBetween(b.startDate, b.endDate);
      days.forEach(function (d, i) {
        var isFirst = i === 0, isLast = i === days.length - 1, single = days.length === 1;
        var slot = single ? b.period : 'full'; // multi-day = full days
        if (slot === 'full' || (single && b.period === 'full')) { cells[d + '|am'] = true; cells[d + '|pm'] = true; }
        else if (b.period === 'am') cells[d + '|am'] = true;
        else if (b.period === 'pm') cells[d + '|pm'] = true;
      });
    });
    return cells;
  }
  // returns 'free' | 'am' (only am free) | 'pm' | 'booked' for a single day
  function dayStatus(listingId, dateStr, ignoreId) {
    var cells = occupiedCells(listingId, ignoreId);
    var am = cells[dateStr + '|am'], pm = cells[dateStr + '|pm'];
    if (!am && !pm) return 'free';
    if (am && pm) return 'booked';
    return am ? 'pm' : 'am'; // the free slot
  }
  function isRangeAvailable(listingId, startDate, endDate, period, ignoreId) {
    var days = datesBetween(startDate, endDate);
    var cells = occupiedCells(listingId, ignoreId);
    if (days.length === 1) {
      if (period === 'full') return !cells[startDate + '|am'] && !cells[startDate + '|pm'];
      return !cells[startDate + '|' + period];
    }
    // multi-day -> needs full days throughout
    return days.every(function (d) { return !cells[d + '|am'] && !cells[d + '|pm']; });
  }
  function priceFor(listing, startDate, endDate, period) {
    var days = datesBetween(startDate, endDate);
    if (days.length === 1) return period === 'full' ? listing.fullDay : listing.halfDay;
    return days.length * listing.fullDay;
  }

  /* ---------- bookings ---------- */
  function bookings() { return db.bookings.slice(); }
  function bookingsForUser(userId) { return db.bookings.filter(function (b) { return b.userId === userId; }); }
  function createBooking(data) {
    if (!isRangeAvailable(data.listingId, data.startDate, data.endDate, data.period)) {
      return { error: 'Sorry — those dates have just been taken. Please pick another slot.' };
    }
    var b = Object.assign({ id: uid('bk'), status: 'pending', createdAt: Date.now() }, data);
    db.bookings.push(b); save(db);
    return { booking: b };
  }
  function setBookingStatus(id, status, patch) {
    var b = db.bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    b.status = status; b.updatedAt = Date.now();
    if (patch) Object.assign(b, patch);
    save(db);
  }

  /* ---------- community submissions (photos + reviews) ---------- */
  function submissions() { return (db.submissions || []).slice(); }
  function submissionsForUser(userId) { return (db.submissions || []).filter(function (s) { return s.userId === userId; }); }
  function createSubmission(data) {
    if (!data.text && !(data.photos && data.photos.length)) return { error: 'Please add a few words or at least one photo.' };
    var s = Object.assign({ id: uid('sub'), status: 'pending', createdAt: Date.now() }, data);
    db.submissions = db.submissions || [];
    db.submissions.unshift(s); save(db);
    return { submission: s };
  }
  function setSubmissionStatus(id, status) {
    var s = (db.submissions || []).find(function (x) { return x.id === id; });
    if (!s) return;
    s.status = status; s.updatedAt = Date.now();
    // on approval, publish its photos to the public gallery (front of list)
    if (status === 'approved' && s.photos && s.photos.length) {
      s.photos.forEach(function (p) { if (db.gallery.indexOf(p) === -1) db.gallery.unshift(p); });
    }
    save(db);
  }
  // approved reviews that have text — surfaced on the marketing site
  function approvedReviews() {
    return (db.submissions || []).filter(function (s) { return s.status === 'approved' && s.text; })
      .sort(function (a, b) { return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
  }

  /* ---------- gallery ---------- */
  function gallery() { return db.gallery.slice(); }
  function addGalleryPhoto(dataUrl) { db.gallery.unshift(dataUrl); save(db); }
  function removeGalleryPhoto(src) { db.gallery = db.gallery.filter(function (g) { return g !== src; }); save(db); }

  /* ---------- admin stats ---------- */
  function stats() {
    return {
      pending: db.bookings.filter(function (b) { return b.status === 'pending'; }).length,
      awaitingPayment: db.bookings.filter(function (b) { return b.status === 'approved'; }).length,
      confirmed: db.bookings.filter(function (b) { return b.status === 'paid'; }).length,
      listings: db.listings.length,
      customers: db.users.filter(function (u) { return u.role === 'customer'; }).length,
      pendingReviews: (db.submissions || []).filter(function (s) { return s.status === 'pending'; }).length
    };
  }

  function resetAll() { localStorage.removeItem(KEY); localStorage.removeItem(SESSION); db = load(); fire(); }

  /* ---------- user admin (edit, password reset) ---------- */
  function updateUser(id, patch) {
    var u = db.users.find(function (x) { return x.id === id; });
    if (!u) return { error: 'User not found.' };
    if (patch.email) {
      var clash = db.users.some(function (x) { return x.id !== id && x.email.toLowerCase() === patch.email.toLowerCase(); });
      if (clash) return { error: 'Another account already uses that email.' };
    }
    Object.assign(u, patch); save(db);
    return { user: u };
  }
  // prototype: returns a (fake) reset link; in production this emails a tokenised URL
  function sendPasswordReset(id) {
    var u = db.users.find(function (x) { return x.id === id; });
    if (!u) return { error: 'User not found.' };
    return { link: 'https://book.sussexvanandtrailerhire.co.uk/reset?token=' + uid('rst'), email: u.email };
  }
  function changePassword(id, currentPw, newPw) {
    var u = db.users.find(function (x) { return x.id === id; });
    if (!u) return { error: 'User not found.' };
    if (u.password !== currentPw) return { error: 'Your current password is incorrect.' };
    if (!newPw || newPw.length < 4) return { error: 'New password must be at least 4 characters.' };
    u.password = newPw; save(db);
    return { ok: true };
  }
  // admin creates a user directly (does NOT log them in)
  function adminCreateUser(data) {
    var email = (data.email || '').trim().toLowerCase();
    if (!data.name || !email || !data.password) return { error: 'Name, email and password are required.' };
    if (db.users.some(function (u) { return u.email.toLowerCase() === email; })) return { error: 'An account with that email already exists.' };
    var u = { id: uid('u'), name: data.name.trim(), email: email, phone: (data.phone || '').trim(), password: data.password, role: data.role === 'admin' ? 'admin' : 'customer', createdAt: Date.now() };
    db.users.push(u); save(db);
    return { user: u };
  }

  /* ---------- gallery reorder ---------- */
  function setGallery(arr) { db.gallery = arr.slice(); save(db); }

  /* ---------- settings / email templates ---------- */
  function getSettings() { if (!db.settings) { db.settings = defaultSettings(); save(db); } return db.settings; }
  function saveTemplate(key, data) {
    if (!db.settings) db.settings = defaultSettings();
    db.settings.templates[key] = data; save(db);
  }
  function renderTemplate(key, booking) {
    var s = getSettings();
    var tpl = s.templates[key] || { subject: '', body: '' };
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
      customer: (booking.customer && booking.customer.name) || 'there',
      item: l.name,
      start: prettyDate(booking.startDate),
      end: prettyDate(booking.endDate),
      period: period,
      price: booking.price,
      deposit: booking.deposit,
      total: total,
      delivery: delivery ? ('£' + delivery) : 'TBC',
      deliverynote: deliveryLine,
      paymentnote: paymentnote,
      paylink: 'https://pay.sussexvanandtrailerhire.co.uk/b/' + (booking.id || 'xxxx'),
      phone: s.phone,
      email: (booking.customer && booking.customer.email) || '',
      fulfilment: booking.fulfilment === 'delivery' ? 'Delivery requested — we’ll confirm a time' : 'Collection from our Rustington yard'
    };
    function fill(str) { return String(str).replace(/\{\{(\w+)\}\}/g, function (m, k) { return (map[k] !== undefined ? map[k] : m); }); }
    return { subject: fill(tpl.subject), body: fill(tpl.body) };
  }

  /* ---------- expose ---------- */
  window.Store = {
    // dates
    ymd: ymd, parseYmd: parseYmd, addDays: addDays, todayYmd: todayYmd, datesBetween: datesBetween,
    prettyDate: prettyDate, shortDate: shortDate, uid: uid,
    // auth
    currentUser: currentUser, signup: signup, login: login, logout: logout,
    // listings
    listings: listings, getListing: getListing, saveListing: saveListing, deleteListing: deleteListing,
    // availability
    dayStatus: dayStatus, isRangeAvailable: isRangeAvailable, priceFor: priceFor, occupiedCells: occupiedCells,
    // bookings
    bookings: bookings, bookingsForUser: bookingsForUser, createBooking: createBooking, setBookingStatus: setBookingStatus,
    // gallery
    gallery: gallery, addGalleryPhoto: addGalleryPhoto, removeGalleryPhoto: removeGalleryPhoto,
    // community submissions
    submissions: submissions, submissionsForUser: submissionsForUser, createSubmission: createSubmission,
    setSubmissionStatus: setSubmissionStatus, approvedReviews: approvedReviews,
    // misc
    stats: stats, subscribe: subscribe, resetAll: resetAll,
    getSettings: getSettings, saveTemplate: saveTemplate, renderTemplate: renderTemplate,
    updateUser: updateUser, sendPasswordReset: sendPasswordReset, changePassword: changePassword, setGallery: setGallery, adminCreateUser: adminCreateUser,
    allUsers: function () { return db.users.slice(); }
  };
})();
