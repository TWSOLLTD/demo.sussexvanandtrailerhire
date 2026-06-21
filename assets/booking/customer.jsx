/* ============================================================
   Customer views — browse listings, listing detail with
   availability calendar + booking request, my bookings.
   ============================================================ */

/* ---------- Listing card ---------- */
function ListingCard(props) {
  var l = props.listing;
  var img = l.photos && l.photos[0];
  return React.createElement('div', { className: 'lcard', onClick: function () { props.onOpen(l.id); } },
    React.createElement('div', { className: 'lcard-img' },
      img ? React.createElement('img', { src: img, alt: l.name, loading: 'lazy' }) : React.createElement(PhotoPH, { van: l.category === 'van' }),
      React.createElement('span', { className: 'cat' }, React.createElement('span', { className: 'badge badge-' + l.category }, l.category === 'van' ? 'Van' : 'Trailer')),
      React.createElement('span', { className: 'price' }, '£', l.fullDay, React.createElement('small', null, '/day')),
      !l.available && React.createElement('div', { className: 'unavail' }, 'Currently unavailable')),
    React.createElement('div', { className: 'lcard-body' },
      React.createElement('h3', null, l.name),
      React.createElement('p', null, l.blurb),
      React.createElement('div', { className: 'lcard-foot' },
        React.createElement('div', { className: 'rates' },
          React.createElement('span', null, 'Full day ', React.createElement('b', null, '£', l.fullDay)),
          React.createElement('span', null, 'Half day ', React.createElement('b', null, '£', l.halfDay))),
        React.createElement('span', { className: 'b-btn b-accent b-sm' }, 'Book', React.createElement(Icon, { name: 'arrow', size: 15 })))));
}

/* ---------- Browse ---------- */
function BrowseView(props) {
  var _f = React.useState('all'), filter = _f[0], setFilter = _f[1];
  var listings = Store.listings();
  var shown = listings.filter(function (l) { return filter === 'all' || l.category === filter; });
  return React.createElement('div', null,
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow2' }, 'Self-drive hire'),
      React.createElement('h1', null, 'Book a trailer or van'),
      React.createElement('p', null, 'Pick an item to see live availability and request your dates. Every hire comes with straps and number plates; a refundable deposit and your driving licence are required at collection.')),
    React.createElement('div', { className: 'chips-row' },
      [['all', 'All'], ['trailer', 'Trailers'], ['van', 'Vans']].map(function (c) {
        return React.createElement('button', { key: c[0], className: 'fchip' + (filter === c[0] ? ' on' : ''), onClick: function () { setFilter(c[0]); } }, c[1]);
      })),
    React.createElement('div', { className: 'lgrid' },
      shown.map(function (l) { return React.createElement(ListingCard, { key: l.id, listing: l, onOpen: props.onOpen }); }))
  );
}

/* ---------- Listing detail + booking ---------- */
function ListingDetail(props) {
  var toast = useToast();
  var l = Store.getListing(props.id);
  var _p = React.useState(0), photoIdx = _p[0], setPhotoIdx = _p[1];
  var _s = React.useState({ start: null, end: null, period: 'full' }), sel = _s[0], setSel = _s[1];
  var _o = React.useState(false), showForm = _o[0], setShowForm = _o[1];
  if (!l) return React.createElement('div', { className: 'empty' }, 'Listing not found.');

  var hasPhotos = l.photos && l.photos.length;
  var endD = sel.end || sel.start;
  var single = sel.start && (!sel.end || sel.start === sel.end);

  function pick(ds, status) {
    // No start yet, or a finished range -> begin a fresh provisional single day
    if (!sel.start || sel.end) {
      var per = status === 'free' ? 'full' : status;
      setSel({ start: ds, end: null, period: per });
      return;
    }
    // Have a start, no end yet -> this click sets the other end of the range
    if (ds === sel.start) return; // same day = keep single
    var s = ds < sel.start ? ds : sel.start;
    var e = ds < sel.start ? sel.start : ds;
    if (!Store.isRangeAvailable(l.id, s, e, 'full')) {
      toast('That range overlaps a booked day — pick again.', 'err');
      setSel({ start: ds, end: null, period: status === 'free' ? 'full' : status });
      return;
    }
    setSel({ start: s, end: e, period: 'full' });
  }
  function setPeriod(p) { setSel(Object.assign({}, sel, { period: p })); }
  function rangePick(start, end) {
    if (!Store.isRangeAvailable(l.id, start, end, 'full')) return;
    setSel({ start: start, end: end, period: 'full' });
  }

  var price = sel.start ? Store.priceFor(l, sel.start, endD, sel.period) : 0;
  var nights = sel.start ? Store.datesBetween(sel.start, endD).length : 0;

  // which periods are pickable for a single selected day
  var dayFree = single ? Store.dayStatus(l.id, sel.start) : 'free';

  return React.createElement('div', null,
    React.createElement('button', { className: 'detail-back', onClick: props.onBack }, React.createElement(Icon, { name: 'back', size: 14 }), 'All vehicles'),
    React.createElement('div', { className: 'detail-grid' },
      // left: gallery + info
      React.createElement('div', null,
        React.createElement('div', { className: 'gallery-main' },
          hasPhotos ? React.createElement('img', { src: l.photos[photoIdx], alt: l.name }) : React.createElement(PhotoPH, { van: l.category === 'van' })),
        hasPhotos && l.photos.length > 1 && React.createElement('div', { className: 'gallery-thumbs' },
          l.photos.map(function (p, i) {
            return React.createElement('button', { key: i, className: i === photoIdx ? 'on' : '', onClick: function () { setPhotoIdx(i); } },
              React.createElement('img', { src: p, alt: '' }));
          })),
        React.createElement('div', { style: { marginTop: 22 } },
          React.createElement('span', { className: 'badge badge-' + l.category }, l.category === 'van' ? 'Van' : 'Trailer'),
          React.createElement('h1', { style: { fontFamily: 'var(--head)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(28px,4vw,40px)', marginTop: 10 } }, l.name),
          React.createElement('p', { style: { color: 'var(--muted)', marginTop: 10, fontSize: 16, lineHeight: 1.55, maxWidth: '52ch' } }, l.description)),
        l.specs && React.createElement('dl', { className: 'spec-grid' },
          Object.keys(l.specs).map(function (k) {
            return React.createElement('div', { key: k },
              React.createElement('dt', null, k), React.createElement('dd', null, l.specs[k]));
          }))
      ),
      // right: booking box
      React.createElement('div', null,
        React.createElement('div', { className: 'card card-pad book-box' },
          React.createElement('div', { className: 'price-head' },
            React.createElement('b', null, '£', l.fullDay), React.createElement('span', null, '/ full day')),
          React.createElement('div', { className: 'dep' }, 'Half-day £', l.halfDay, ' · refundable deposit £', l.deposit),
          !l.available
            ? React.createElement('div', { className: 'b-note' }, 'This item is currently marked unavailable. Please check back soon or call us on 07378 152002.')
            : React.createElement(React.Fragment, null,
              React.createElement(BookingCalendar, { listingId: l.id, value: sel, viewMonth: Store.todayYmd().slice(0, 7) + '-01', onPick: pick, onRange: rangePick }),
              React.createElement('p', { className: 'b-hint', style: { textAlign: 'center', marginTop: 8 } }, 'One day: click it. Several days: click the first then the last, or drag across them.'),
              single && React.createElement('div', { className: 'period-pick' },
                React.createElement('button', { className: sel.period === 'am' ? 'on' : '', disabled: dayFree === 'pm', onClick: function () { setPeriod('am'); } }, 'Morning'),
                React.createElement('button', { className: sel.period === 'pm' ? 'on' : '', disabled: dayFree === 'am', onClick: function () { setPeriod('pm'); } }, 'Afternoon'),
                React.createElement('button', { className: sel.period === 'full' ? 'on' : '', disabled: dayFree !== 'free', onClick: function () { setPeriod('full'); } }, 'Full day')),
              sel.start && React.createElement('div', { className: 'book-summary' },
                React.createElement('div', { className: 'line' },
                  React.createElement('span', null, single ? Store.prettyDate(sel.start) : Store.shortDate(sel.start) + ' → ' + Store.shortDate(endD)),
                  React.createElement('span', null, single ? (sel.period === 'full' ? 'Full day' : sel.period === 'am' ? 'Morning' : 'Afternoon') : nights + ' days')),
                React.createElement('div', { className: 'line' }, React.createElement('span', null, 'Hire'), React.createElement('span', null, '£', price)),
                React.createElement('div', { className: 'line' }, React.createElement('span', null, 'Refundable deposit'), React.createElement('span', null, '£', l.deposit)),
                React.createElement('div', { className: 'line total' }, React.createElement('span', null, 'Due at collection'), React.createElement('span', null, '£', price + l.deposit))),
              React.createElement('button', { className: 'b-btn b-accent b-block', style: { marginTop: 16 }, disabled: !sel.start, onClick: function () { setShowForm(true); } },
                sel.start ? 'Request this booking' : 'Select your dates', React.createElement(Icon, { name: 'arrow', size: 17 })),
              React.createElement('p', { className: 'b-hint', style: { textAlign: 'center', marginTop: 10 } }, 'No payment now. We approve your request first, then card payers get a secure deposit link; cash payers settle up at collection.'))
        ))
    ),
    showForm && React.createElement(BookingForm, { listing: l, sel: { start: sel.start, end: endD, period: sel.period }, user: props.user, onClose: function () { setShowForm(false); }, onDone: props.onBooked })
  );
}

/* ---------- Booking request form (modal) ---------- */
function BookingForm(props) {
  var toast = useToast();
  var l = props.listing, sel = props.sel, u = props.user;
  var _f = React.useState({
    name: u.name || '', phone: u.phone || '', email: u.email || '',
    towing: '', towingReg: '', plateWanted: false, electrics: '7-pin', licence: '', fulfilment: 'collection', paymentMethod: 'card', notes: ''
  }), f = _f[0], setF = _f[1];
  var _e = React.useState(''), err = _e[0], setErr = _e[1];
  function upd(k) { return function (e) { setF(Object.assign({}, f, { [k]: e.target.value })); }; }
  function updBool(k) { return function (e) { setF(Object.assign({}, f, { [k]: e.target.checked })); }; }
  var isVan = l.category === 'van';
  var single = sel.start === sel.end;
  var price = Store.priceFor(l, sel.start, sel.end, sel.period);

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!f.name || !f.phone || !f.email) { setErr('Please fill in your name, phone and email.'); return; }
    if (!f.licence) { setErr('Driving licence details are required to hire.'); return; }
    if (!isVan && !f.towingReg) { setErr('Please enter your towing vehicle registration.'); return; }
    var res = Store.createBooking({
      listingId: l.id, userId: u.id,
      startDate: sel.start, endDate: sel.end, period: sel.period,
      customer: { name: f.name, phone: f.phone, email: f.email },
      towing: f.towing, towingReg: f.towingReg, plateWanted: f.plateWanted, electrics: isVan ? '' : f.electrics,
      licence: f.licence, fulfilment: f.fulfilment, paymentMethod: f.paymentMethod, notes: f.notes,
      price: price, deposit: l.deposit
    });
    if (res.error) { setErr(res.error); return; }
    props.onClose();
    props.onDone();
    toast('Booking request sent — we\u2019ll confirm shortly.', 'ok');
  }

  return React.createElement(Modal, {
    title: 'Request booking', wide: true, onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Cancel'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: submit }, 'Send request', React.createElement(Icon, { name: 'check', size: 17 })))
  },
    React.createElement('div', { className: 'card-pad', style: { background: 'var(--paper-2)', borderRadius: 8, marginBottom: 20, padding: '14px 16px' } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
        React.createElement('b', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase' } }, l.name),
        React.createElement('span', null, single ? Store.prettyDate(sel.start) + (sel.period !== 'full' ? ' (' + (sel.period === 'am' ? 'morning' : 'afternoon') + ')' : '') : Store.prettyDate(sel.start) + ' → ' + Store.prettyDate(sel.end))),
      React.createElement('div', { style: { marginTop: 6, color: 'var(--muted)', fontSize: 14 } }, 'Hire £', price, ' + refundable deposit £', l.deposit, ' = ', React.createElement('b', { style: { color: 'var(--ink)' } }, '£', price + l.deposit), ' due at collection')),
    err && React.createElement('div', { className: 'b-error' }, err),
    React.createElement('div', { className: 'b-row' },
      React.createElement(Field, { label: 'Name', required: true, value: f.name, onChange: upd('name') }),
      React.createElement(Field, { label: 'Phone', type: 'tel', required: true, value: f.phone, onChange: upd('phone') })),
    React.createElement(Field, { label: 'Email', type: 'email', required: true, value: f.email, onChange: upd('email') }),
    !isVan && React.createElement(Field, { label: 'Towing vehicle', value: f.towing, onChange: upd('towing'), placeholder: 'e.g. Land Rover Discovery 4', hint: 'Make/model of the vehicle you\u2019ll tow with.' }),
    !isVan && React.createElement(Field, { label: 'Tow vehicle electrics', type: 'select', value: f.electrics, onChange: upd('electrics'), hint: f.electrics === 'not sure' ? 'No problem — we’ll contact you to confirm, or you can send us a photo of your towbar connector.' : 'Does your vehicle have a 7-pin or 13-pin towing socket? Check the plug at your towbar.', options: [{ value: '7-pin', label: '7-pin socket' }, { value: '13-pin', label: '13-pin socket' }, { value: 'not sure', label: 'Not sure' }] }),
    !isVan && React.createElement(Field, { label: 'Towing vehicle registration', required: true, value: f.towingReg, onChange: upd('towingReg'), placeholder: 'e.g. AB12 CDE', hint: 'Required — your trailer must legally display a plate matching your towing vehicle.' }),
    !isVan && React.createElement('div', { className: 'b-field' },
      React.createElement('label', { className: 'toggle' },
        React.createElement('input', { type: 'checkbox', checked: f.plateWanted, onChange: updBool('plateWanted') }),
        React.createElement('span', { className: 'tr' }), 'Please supply a magnetic number plate'),
      React.createElement('div', { className: 'b-hint' }, 'Free — we’ll make up a magnetic plate matching your registration. Leave off if you’ll bring your own.')),
    React.createElement(Field, { label: 'Driving licence', required: true, value: f.licence, onChange: upd('licence'), placeholder: 'Driving licence number', hint: isVan ? 'Full UK licence required. Drivers 25+ (TBC). Bring your licence to collection.' : 'Bring your physical licence to collection. Category B / BE as appropriate.' }),
    React.createElement(Field, { label: 'Collection or delivery?', type: 'select', value: f.fulfilment, onChange: upd('fulfilment'),
      options: [{ value: 'collection', label: 'I\u2019ll collect from Rustington' }, { value: 'delivery', label: 'Please quote delivery to me' }] }),
    React.createElement(Field, { label: 'How would you like to pay?', type: 'select', value: f.paymentMethod, onChange: upd('paymentMethod'),
      hint: f.paymentMethod === 'cash' ? 'Once we approve your request you\u2019ll get a confirmation email — pay the hire & deposit in cash at collection.' : 'Once we approve your request we\u2019ll email you a secure link to pay your deposit, then a confirmation with collection details.',
      options: [{ value: 'card', label: 'Pay by card (secure link after approval)' }, { value: 'cash', label: 'Pay cash on collection' }] }),
    React.createElement(Field, { label: 'Notes', type: 'textarea', value: f.notes, onChange: upd('notes'), placeholder: 'Anything we should know — what you\u2019re moving, postcodes for delivery, flexible times…' })
  );
}

/* ---------- My bookings ---------- */
function MyBookings(props) {
  var toast = useToast();
  var mine = Store.bookingsForUser(props.user.id).sort(function (a, b) { return b.createdAt - a.createdAt; });
  var _ed = React.useState(null), editing = _ed[0], setEditing = _ed[1];
  function cancel(id) { Store.setBookingStatus(id, 'cancelled', { cancelledBy: 'customer' }); toast('Booking cancelled.', ''); props.refresh(); }
  function pay(id) { Store.setBookingStatus(id, 'paid'); toast('Payment received — you\u2019re confirmed!', 'ok'); props.refresh(); }
  if (!mine.length) return React.createElement('div', null,
    React.createElement('div', { className: 'page-head' }, React.createElement('h1', null, 'My bookings')),
    React.createElement('div', { className: 'empty' },
      React.createElement(Icon, { name: 'cal', size: 54, sw: 1.3 }),
      React.createElement('h3', null, 'No bookings yet'),
      React.createElement('p', null, 'Browse our trailers and vans to request your first hire.'),
      React.createElement('button', { className: 'b-btn b-accent', style: { marginTop: 16 }, onClick: props.onBrowse }, 'Browse vehicles', React.createElement(Icon, { name: 'arrow', size: 16 }))));

  return React.createElement('div', null,
    React.createElement('div', { className: 'page-head' },
      React.createElement('h1', null, 'My bookings'),
      React.createElement('p', null, 'Track the status of your hire requests. We confirm each one by phone.')),
    React.createElement('div', { className: 'bk-list' },
      mine.map(function (b) {
        var l = Store.getListing(b.listingId) || { name: 'Removed item', photos: [], category: 'trailer' };
        var single = b.startDate === b.endDate;
        var when = single ? Store.prettyDate(b.startDate) + (b.period !== 'full' ? ' · ' + (b.period === 'am' ? 'Morning' : 'Afternoon') : ' · Full day') : Store.prettyDate(b.startDate) + ' → ' + Store.prettyDate(b.endDate);
        return React.createElement('div', { key: b.id, className: 'bk-row' },
          React.createElement('div', { className: 'bk-thumb' },
            l.photos && l.photos[0] ? React.createElement('img', { src: l.photos[0], alt: '' }) : React.createElement('div', { className: 'ph' }, React.createElement(Icon, { name: l.category === 'van' ? 'van' : 'truck', size: 22 }))),
          React.createElement('div', { className: 'bk-meta' },
            React.createElement('h4', null, l.name),
            React.createElement('div', { className: 'when' }, when),
            React.createElement('div', { className: 'who2' }, b.status === 'pending' ? 'Awaiting our approval' : b.status === 'approved' ? (b.paymentMethod === 'cash' ? 'Approved — pay cash on collection' : 'Approved — please pay your deposit to confirm') : b.status === 'paid' ? 'Confirmed — check your email for collection details' : (b.fulfilment === 'delivery' ? 'Delivery requested' : 'Collection from Rustington'))),
          React.createElement('div', { className: 'bk-side' },
            React.createElement(Badge, { kind: b.status, dot: true }),
            React.createElement('div', { className: 'amt' }, '£', b.price),
            b.status === 'approved' && b.paymentMethod !== 'cash' && React.createElement('button', { className: 'b-btn b-accent b-sm', onClick: function () { pay(b.id); } }, 'Pay £', b.deposit, ' deposit'),
            b.status === 'pending' && React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: function () { setEditing(b); } }, 'Edit dates'),
            (b.status === 'pending' || b.status === 'approved') && React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: function () { cancel(b.id); } }, 'Cancel')));
      })),
    editing && React.createElement(EditBookingModal, { booking: editing, onClose: function () { setEditing(null); }, onDone: function () { setEditing(null); props.refresh(); } })
  );
}

/* ---------- Edit a pending booking's dates and resubmit ---------- */
function EditBookingModal(props) {
  var toast = useToast();
  var b = props.booking;
  var l = Store.getListing(b.listingId) || { name: 'Item', fullDay: 0, halfDay: 0, deposit: 0, category: 'trailer' };
  var _s = React.useState({ start: b.startDate, end: b.endDate, period: b.period }), sel = _s[0], setSel = _s[1];
  var awaitEnd = React.useRef(false);
  var endD = sel.end || sel.start;
  var single = sel.start && (!sel.end || sel.start === sel.end);
  function pick(ds, status) {
    if (!sel.start || sel.end) { setSel({ start: ds, end: null, period: status === 'free' ? 'full' : status }); return; }
    if (ds === sel.start) return;
    var a = ds < sel.start ? ds : sel.start, c = ds < sel.start ? sel.start : ds;
    if (!Store.isRangeAvailable(l.id, a, c, 'full', b.id)) { toast('That range overlaps a booked day — pick again.', 'err'); setSel({ start: ds, end: null, period: 'full' }); return; }
    setSel({ start: a, end: c, period: 'full' });
  }
  function rangePick(a, c) { if (Store.isRangeAvailable(l.id, a, c, 'full', b.id)) setSel({ start: a, end: c, period: 'full' }); }
  function save() {
    if (!Store.isRangeAvailable(l.id, sel.start, endD, sel.period, b.id)) { toast('Those dates aren’t available — pick again.', 'err'); return; }
    var price = Store.priceFor(l, sel.start, endD, sel.period);
    Store.setBookingStatus(b.id, 'pending', { startDate: sel.start, endDate: endD, period: sel.period, price: price });
    toast('Dates updated — resubmitted for approval.', 'ok');
    props.onDone();
  }
  var price = Store.priceFor(l, sel.start, endD, sel.period);
  return React.createElement(Modal, { title: 'Edit booking dates', onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Cancel'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: save }, React.createElement(Icon, { name: 'check', size: 16 }), 'Save & resubmit')) },
    React.createElement('p', { style: { color: 'var(--muted)', fontSize: 14, marginBottom: 14 } }, l.name, ' — pick new dates below. Changing them puts the booking back to ', React.createElement('b', null, 'awaiting approval'), '.'),
    React.createElement(BookingCalendar, { listingId: l.id, value: sel, viewMonth: (sel.start || Store.todayYmd()).slice(0, 7) + '-01', ignoreBookingId: b.id, onPick: pick, onRange: rangePick }),
    React.createElement('p', { className: 'b-hint', style: { textAlign: 'center', marginTop: 8 } }, 'One day: click it. Several: click first then last, or drag.'),
    React.createElement('div', { className: 'book-summary', style: { marginTop: 12 } },
      React.createElement('div', { className: 'line' }, React.createElement('span', null, single ? Store.prettyDate(sel.start) : Store.shortDate(sel.start) + ' → ' + Store.shortDate(endD)), React.createElement('span', null, '£', price)))
  );
}

/* ---------- Share your trip (customer photo + review upload) ---------- */
function ShareTrip(props) {
  var toast = useToast();
  var listings = Store.listings();
  var mine = Store.submissionsForUser(props.user.id).sort(function (a, b) { return b.createdAt - a.createdAt; });
  var _f = React.useState({ listingId: listings[0] ? listings[0].id : '', rating: 5, text: '', photos: [], anonymous: false }), f = _f[0], setF = _f[1];
  var _e = React.useState(''), err = _e[0], setErr = _e[1];
  var fileRef = React.useRef(null);
  function upd(k, v) { setF(Object.assign({}, f, { [k]: v })); }

  function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    files.forEach(function (file) { readImageScaled(file, function (url) { setF(function (p) { return Object.assign({}, p, { photos: p.photos.concat([url]) }); }); }); });
    e.target.value = '';
  }
  function removePhoto(i) { setF(Object.assign({}, f, { photos: f.photos.filter(function (_, k) { return k !== i; }) })); }

  function submit() {
    setErr('');
    var listing = Store.getListing(f.listingId);
    var res = Store.createSubmission({
      userId: props.user.id, userName: props.user.name, anonymous: f.anonymous,
      listingId: f.listingId, listingName: f.listingId ? (listing ? listing.name : '') : 'Previous hire',
      rating: f.rating, text: f.text.trim(), photos: f.photos
    });
    if (res.error) { setErr(res.error); return; }
    setF({ listingId: f.listingId, rating: 5, text: '', photos: [], anonymous: f.anonymous });
    toast('Thanks! Sent for approval.', 'ok');
    props.refresh();
  }

  return React.createElement('div', null,
    React.createElement('div', { className: 'page-head' },
      React.createElement('div', { className: 'eyebrow2' }, 'Community'),
      React.createElement('h1', null, 'Share your trip'),
      React.createElement('p', null, 'Hired a trailer or van from us? Upload your photos and leave a review. Once we\u2019ve approved it, it can appear in the website gallery and reviews \u2014 thank you!')),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }, className: 'share-grid' },
      // form
      React.createElement('div', { className: 'card card-pad' },
        err && React.createElement('div', { className: 'b-error' }, err),
        React.createElement(Field, { label: 'Which did you hire?', type: 'select', value: f.listingId, onChange: function (e) { upd('listingId', e.target.value); },
          options: [{ value: '', label: 'A previous / other hire' }].concat(listings.map(function (l) { return { value: l.id, label: l.name }; })) }),
        React.createElement('div', { className: 'b-field' },
          React.createElement('label', null, 'Your rating'),
          React.createElement(Stars, { value: f.rating, input: true, onChange: function (n) { upd('rating', n); } })),
        React.createElement(Field, { label: 'Your review', type: 'textarea', value: f.text, onChange: function (e) { upd('text', e.target.value); }, placeholder: 'How did it go? What did you move? Would you recommend us?' }),
        React.createElement('div', { className: 'b-field' },
          React.createElement('label', null, 'Your photos'),
          React.createElement('div', { className: 'photo-edit' },
            f.photos.map(function (p, i) {
              return React.createElement('div', { key: i, className: 'pe' },
                React.createElement('img', { src: p, alt: '' }),
                React.createElement('button', { onClick: function () { removePhoto(i); }, 'aria-label': 'Remove' }, React.createElement(Icon, { name: 'x', size: 13 })));
            }),
            React.createElement('button', { className: 'photo-add', type: 'button', onClick: function () { fileRef.current.click(); } }, React.createElement(Icon, { name: 'plus', size: 22 })),
            React.createElement('input', { ref: fileRef, type: 'file', accept: 'image/*', multiple: true, onChange: onFiles, style: { display: 'none' } })),
          React.createElement('div', { className: 'b-hint' }, 'Photos are reviewed before they appear publicly.')),
        React.createElement('div', { className: 'b-field' },
          React.createElement('label', { className: 'toggle' },
            React.createElement('input', { type: 'checkbox', checked: f.anonymous, onChange: function (e) { upd('anonymous', e.target.checked); } }),
            React.createElement('span', { className: 'tr' }), 'Post anonymously'),
          React.createElement('div', { className: 'b-hint' }, f.anonymous ? 'Your review will show as “Anonymous” — your name stays private.' : 'Your first name will be shown with your review. Tick to hide it.')),
        React.createElement('button', { className: 'b-btn b-accent b-block', onClick: submit }, React.createElement(Icon, { name: 'image', size: 17 }), 'Submit for approval')),
      // my submissions
      React.createElement('div', null,
        React.createElement('h3', { style: { fontFamily: 'var(--head)', fontWeight: 800, textTransform: 'uppercase', fontSize: 18, marginBottom: 12 } }, 'Your submissions'),
        !mine.length
          ? React.createElement('div', { className: 'b-note' }, 'Nothing submitted yet. Your uploads will show here with their approval status.')
          : React.createElement('div', { className: 'bk-list' },
            mine.map(function (s) {
              return React.createElement('div', { key: s.id, className: 'card card-pad', style: { padding: 16 } },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
                  React.createElement(Stars, { value: s.rating }),
                  React.createElement(Badge, { kind: s.status, dot: true })),
                s.listingName && React.createElement('div', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 13, color: 'var(--muted)', marginTop: 6 } }, s.listingName),
                s.text && React.createElement('p', { style: { fontSize: 14.5, marginTop: 6, color: 'var(--ink-2)' } }, '\u201C', s.text, '\u201D'),
                s.photos && s.photos.length ? React.createElement('div', { style: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' } },
                  s.photos.map(function (p, i) { return React.createElement('img', { key: i, src: p, alt: '', style: { width: 70, height: 52, objectFit: 'cover', borderRadius: 6 } }); })) : null);
            })))
    )
  );
}

Object.assign(window, { BrowseView: BrowseView, ListingDetail: ListingDetail, MyBookings: MyBookings, ShareTrip: ShareTrip });
