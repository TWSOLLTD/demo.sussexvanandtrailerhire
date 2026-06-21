/* ============================================================
   Admin views — approvals inbox, all-bookings calendar,
   listings manager (CRUD + photos), gallery, customers, emails.
   ============================================================ */

/* spec presets used to prefill the listing editor by category */
var SPEC_PRESETS = {
  trailer: { 'Type': 'Flatbed', 'Bed length': '2.4 m', 'Width': '1.3 m', 'Axles': 'Single', 'Max load': '750 kg' },
  van: { 'Type': 'Panel van', 'Load length': '2.6 m', 'Load height': '1.7 m', 'Payload': '1000 kg', 'Seats': '3', 'Fuel': 'Diesel' }
};

/* ---------- Admin dashboard shell ---------- */
function AdminDashboard(props) {
  var _t = React.useState('inbox'), tab = _t[0], setTab = _t[1];
  var _if = React.useState('pending'), inboxFilter = _if[0], setInboxFilter = _if[1];
  var s = Store.stats();
  function goInbox(f) { setInboxFilter(f); setTab('inbox'); }
  var tabs = [
    { id: 'inbox', label: 'Requests', icon: 'inbox', pill: s.pending || null },
    { id: 'calendar', label: 'Calendar', icon: 'cal' },
    { id: 'listings', label: 'Fleet', icon: 'truck' },
    { id: 'customers', label: 'Customers', icon: 'user' },
    { id: 'reviews', label: 'Reviews & photos', icon: 'image', pill: s.pendingReviews || null },
    { id: 'gallery', label: 'Gallery', icon: 'grid' },
    { id: 'emails', label: 'Emails', icon: 'mail' }
  ];
  var sections = {
    inbox: { title: 'Booking requests', sub: 'Approve or decline incoming hire requests.' },
    calendar: { title: 'Availability calendar', sub: 'Every booking and maintenance block across the fleet.' },
    listings: { title: 'Fleet', sub: 'Each trailer and van — rates, photos, specs and availability.' },
    customers: { title: 'Customers', sub: 'Everyone with an account and their booking history.' },
    reviews: { title: 'Reviews & photos', sub: 'Moderate customer submissions before they go public.' },
    gallery: { title: 'Website gallery', sub: 'The photos shown on your public site. Drag to reorder.' },
    emails: { title: 'Automatic emails', sub: 'Wording sent to customers at each step.' }
  };
  var cur = sections[tab] || sections.inbox;
  return React.createElement('div', { className: 'adm-shell' },
    React.createElement('aside', { className: 'adm-side' },
      React.createElement('div', { className: 'adm-side-cap' }, 'Admin'),
      tabs.map(function (t) {
        return React.createElement('button', { key: t.id, className: 'adm-navitem' + (tab === t.id ? ' on' : ''), onClick: function () { setTab(t.id); } },
          React.createElement(Icon, { name: t.icon, size: 17 }),
          React.createElement('span', null, t.label),
          t.pill ? React.createElement('span', { className: 'count' }, t.pill) : null);
      })),
    React.createElement('div', { className: 'adm-content' },
      React.createElement('div', { className: 'sec-bar' },
        React.createElement('div', null,
          React.createElement('h2', null, cur.title),
          React.createElement('p', null, cur.sub))),
      tab === 'inbox' && React.createElement(AdminInbox, { key: inboxFilter, initialFilter: inboxFilter, refresh: props.refresh, stats: s, onJump: setTab }),
      tab === 'calendar' && React.createElement(AdminCalendar, { refresh: props.refresh }),
      tab === 'listings' && React.createElement(ListingsManager, { refresh: props.refresh }),
      tab === 'customers' && React.createElement(CustomersView, { refresh: props.refresh }),
      tab === 'reviews' && React.createElement(SubmissionsManager, { refresh: props.refresh }),
      tab === 'gallery' && React.createElement(GalleryManager, { refresh: props.refresh }),
      tab === 'emails' && React.createElement(EmailManager, { refresh: props.refresh }))
  );
}

/* ---------- Inbox / approvals ---------- */
function AdminInbox(props) {
  var toast = useToast();
  var _f = React.useState(props.initialFilter || 'pending'), filter = _f[0], setFilter = _f[1];
  var _d = React.useState(null), detail = _d[0], setDetail = _d[1];
  var all = Store.bookings().sort(function (a, b) { return b.createdAt - a.createdAt; });
  var shown = all.filter(function (b) { return filter === 'all' || b.status === filter; });
  var st = props.stats || {};

  function act(id, status, label, patch) { Store.setBookingStatus(id, status, patch); toast(label, (status === 'paid' || status === 'approved') ? 'ok' : ''); props.refresh(); setDetail(null); }

  return React.createElement('div', null,
    React.createElement('div', { className: 'mini-stats' },
      React.createElement('button', { className: 'mini-stat' + (filter === 'pending' ? ' on' : ''), onClick: function () { setFilter('pending'); } }, React.createElement('b', null, st.pending), React.createElement('span', null, 'Awaiting approval')),
      React.createElement('button', { className: 'mini-stat' + (filter === 'approved' ? ' on' : ''), onClick: function () { setFilter('approved'); } }, React.createElement('b', null, st.awaitingPayment), React.createElement('span', null, 'Awaiting payment')),
      React.createElement('button', { className: 'mini-stat' + (filter === 'paid' ? ' on' : ''), onClick: function () { setFilter('paid'); } }, React.createElement('b', null, st.confirmed), React.createElement('span', null, 'Confirmed')),
      React.createElement('button', { className: 'mini-stat', onClick: function () { props.onJump && props.onJump('customers'); } }, React.createElement('b', null, st.customers), React.createElement('span', null, 'Customers'))),
    React.createElement('div', { className: 'seg', style: { marginBottom: 18 } },
      [['pending', 'Pending'], ['approved', 'Awaiting payment'], ['paid', 'Confirmed'], ['declined', 'Declined'], ['cancelled', 'Cancelled'], ['all', 'All']].map(function (c) {
        return React.createElement('button', { key: c[0], className: 'seg-btn' + (filter === c[0] ? ' on' : ''), onClick: function () { setFilter(c[0]); } }, c[1]);
      })),
    !shown.length
      ? React.createElement('div', { className: 'empty' }, React.createElement(Icon, { name: 'inbox', size: 54, sw: 1.3 }), React.createElement('h3', null, 'Nothing here'), React.createElement('p', null, 'No ', filter, ' bookings.'))
      : React.createElement('div', { className: 'bk-list' },
        shown.map(function (b) {
          var l = Store.getListing(b.listingId) || { name: 'Removed item', photos: [], category: 'trailer' };
          var single = b.startDate === b.endDate;
          var when = single ? Store.prettyDate(b.startDate) + (b.period !== 'full' ? ' · ' + (b.period === 'am' ? 'AM' : 'PM') : ' · Full day') : Store.shortDate(b.startDate) + ' → ' + Store.shortDate(b.endDate);
          var cash = b.paymentMethod === 'cash';
          return React.createElement('div', { key: b.id, className: 'bk-row' },
            React.createElement('div', { className: 'bk-thumb' },
              l.photos && l.photos[0] ? React.createElement('img', { src: l.photos[0], alt: '' }) : React.createElement('div', { className: 'ph' }, React.createElement(Icon, { name: l.category === 'van' ? 'van' : 'truck', size: 22 }))),
            React.createElement('div', { className: 'bk-meta' },
              React.createElement('h4', null, l.name, React.createElement('span', { className: 'paytag ' + (cash ? 'cash' : 'card') }, cash ? 'Cash' : 'Card')),
              React.createElement('div', { className: 'when' }, when, ' · ', b.fulfilment === 'delivery' ? 'Delivery' : 'Collection'),
              React.createElement('div', { className: 'who2' }, b.customer.name, ' · ', b.customer.phone)),
            React.createElement('div', { className: 'bk-side' },
              React.createElement(Badge, { kind: b.status, dot: true }),
              React.createElement('div', { className: 'amt' }, '£', b.price),
              React.createElement('div', { className: 'bk-actions' },
                React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: function () { setDetail(b); } }, 'View'),
                b.status === 'pending' && React.createElement('button', { className: 'b-btn b-ok b-sm', onClick: function () { setDetail(b); } }, 'Review & approve'),
                b.status === 'approved' && React.createElement('button', { className: 'b-btn b-ok b-sm', onClick: function () { act(b.id, 'paid', 'Payment received — confirmation sent ✓'); } }, 'Mark paid'))));
        })),
    detail && React.createElement(BookingDetailModal, { booking: detail, onClose: function () { setDetail(null); }, onAct: act })
  );
}

function BookingDetailModal(props) {
  var b = props.booking;
  var _ep = React.useState(null), emailPreview = _ep[0], setEmailPreview = _ep[1];
  var _dp = React.useState(b.deliveryPrice || ''), deliveryPrice = _dp[0], setDeliveryPrice = _dp[1];
  var l = Store.getListing(b.listingId) || { name: 'Removed item', category: 'trailer' };
  var single = b.startDate === b.endDate;
  var cash = b.paymentMethod === 'cash';
  var isVan = l.category === 'van';
  var rows = [
    ['Dates', single ? Store.prettyDate(b.startDate) : Store.prettyDate(b.startDate) + ' → ' + Store.prettyDate(b.endDate)],
    ['Period', single ? (b.period === 'full' ? 'Full day' : b.period === 'am' ? 'Morning' : 'Afternoon') : Store.datesBetween(b.startDate, b.endDate).length + ' days'],
    ['Fulfilment', b.fulfilment === 'delivery' ? 'Delivery requested' : 'Collection from Rustington'],
    ['Customer', b.customer.name],
    ['Phone', b.customer.phone],
    ['Email', b.customer.email]
  ];
  if (!isVan) {
    rows.push(['Towing vehicle', b.towing || '—']);
    rows.push(['Tow electrics', b.electrics ? b.electrics + ' socket' : '—']);
    rows.push(['Number plate', b.plateWanted ? 'Supply plate' + (b.towingReg ? ' — ' + b.towingReg : '') : 'Not required']);
  }
  rows.push(['Driving licence', b.licence || '—']);
  rows.push(['Hire price', '£' + b.price]);
  rows.push(['Deposit', '£' + b.deposit + ' (refundable)']);
  rows.push(['Notes', b.notes || '—']);

  var footer;
  if (b.status === 'pending') {
    footer = React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close'),
      React.createElement('button', { className: 'b-btn b-danger', onClick: function () { props.onAct(b.id, 'declined', 'Booking declined.'); } }, 'Decline'),
      cash
        ? React.createElement('button', { className: 'b-btn b-ok', onClick: function () { props.onAct(b.id, 'paid', 'Approved (cash) — confirmation sent ✓', { deliveryPrice: parseInt(deliveryPrice, 10) || 0 }); } }, React.createElement(Icon, { name: 'check', size: 16 }), 'Approve (cash) & confirm')
        : React.createElement('button', { className: 'b-btn b-ok', onClick: function () { props.onAct(b.id, 'approved', 'Approved — payment link sent ✓', { deliveryPrice: parseInt(deliveryPrice, 10) || 0 }); } }, React.createElement(Icon, { name: 'check', size: 16 }), 'Approve & send pay link'));
  } else if (b.status === 'approved') {
    footer = React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close'),
      React.createElement('button', { className: 'b-btn b-danger', onClick: function () { if (window.confirm('Cancel this booking? The customer\u2019s dates will be released.')) props.onAct(b.id, 'cancelled', 'Booking cancelled.'); } }, 'Cancel booking'),
      React.createElement('button', { className: 'b-btn b-ok', onClick: function () { props.onAct(b.id, 'paid', 'Payment received — confirmation sent ✓', { deliveryPrice: parseInt(deliveryPrice, 10) || 0 }); } }, React.createElement(Icon, { name: 'check', size: 16 }), 'Mark as paid & confirm'));
  } else if (b.status === 'paid') {
    footer = React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close'),
      React.createElement('button', { className: 'b-btn b-danger', onClick: function () { if (window.confirm('Cancel this confirmed booking? The dates will be released — handle any refund separately.')) props.onAct(b.id, 'cancelled', 'Booking cancelled.'); } }, 'Cancel booking'));
  } else {
    footer = React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close');
  }

  var emailBtns = cash
    ? [['confirmation', 'Confirmation', 'mail'], ['reminder', 'Reminder', 'clock']]
    : [['approval', 'Payment email', 'mail'], ['confirmation', 'Confirmation', 'mail'], ['reminder', 'Reminder', 'clock']];

  return React.createElement(Modal, { title: 'Booking request', wide: true, onClose: props.onClose, footer: footer },
    React.createElement('div', { className: 'req-grid' },
      React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
          React.createElement('h3', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 20 } }, l.name),
          React.createElement(Badge, { kind: b.status, dot: true })),
        React.createElement('div', { className: 'pay-banner ' + (cash ? 'cash' : 'card') },
          React.createElement('b', null, cash ? '💷 Cash on collection' : '💳 Card payment'),
          React.createElement('span', null, cash
            ? 'Pays £' + (b.price + b.deposit) + ' cash at collection. Approving sends the confirmation email straight away.'
            : 'Approving emails a secure link to pay the £' + b.deposit + ' deposit; confirmation follows once paid.')),
        (b.fulfilment === 'delivery' && (b.status === 'pending' || b.status === 'approved')) && React.createElement('div', { className: 'b-field', style: { margin: '0 0 14px' } }, React.createElement('label', null, 'Delivery quote (£) — added to the email'), React.createElement('input', { type: 'number', value: deliveryPrice, onChange: function (e) { setDeliveryPrice(e.target.value); }, placeholder: 'e.g. 40', style: { width: '100%', padding: '10px 12px', border: '1.5px solid var(--line)', borderRadius: 6 } }), React.createElement('div', { className: 'b-hint' }, 'Set this before approving — the customer sees it in their email.')),
        React.createElement('div', { className: 'kv' },
          rows.map(function (r) {
            return React.createElement('div', { key: r[0], className: 'kvrow' }, React.createElement('b', null, r[0]), React.createElement('span', null, r[1]));
          })),
        React.createElement('div', { style: { marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' } },
          React.createElement('a', { className: 'b-btn b-ghost b-sm', href: 'tel:' + (b.customer.phone || '').replace(/\s/g, '') }, React.createElement(Icon, { name: 'phone', size: 15 }), 'Call'),
          React.createElement('a', { className: 'b-btn b-ghost b-sm', href: 'mailto:' + b.customer.email }, React.createElement(Icon, { name: 'mail', size: 15 }), 'Email')),
        React.createElement('div', { style: { marginTop: 10 } },
          React.createElement('div', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 6 } }, 'Preview the emails this booking will send'),
          React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            emailBtns.map(function (e) {
              return React.createElement('button', { key: e[0], className: 'b-btn b-ghost b-sm', onClick: function () { setEmailPreview(e[0]); } }, React.createElement(Icon, { name: e[2], size: 15 }), e[1]);
            })))),
      React.createElement('div', { className: 'req-cal' },
        React.createElement('div', { className: 'req-cal-head' },
          React.createElement('b', null, 'Availability'),
          React.createElement('span', null, 'This request is highlighted. Booked and maintenance days are marked so you can spot clashes.')),
        React.createElement(BookingCalendar, { listingId: b.listingId, value: { start: b.startDate, end: b.endDate, period: b.period }, viewMonth: b.startDate.slice(0, 7) + '-01', ignoreBookingId: b.id, readOnly: true, onPick: function () {} }))),
    emailPreview && React.createElement(EmailPreview, { which: emailPreview, booking: b, onClose: function () { setEmailPreview(null); } })
  );
}

/* ---------- Email preview ---------- */
function EmailPreview(props) {
  var r = Store.renderTemplate(props.which, props.booking);
  var labels = { approval: 'Payment request', confirmation: 'Booking confirmation', reminder: 'End-of-hire reminder' };
  return React.createElement(Modal, {
    title: (labels[props.which] || 'Email') + ' preview', wide: true, onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('span', { style: { marginRight: 'auto', fontSize: 13, color: 'var(--muted)' } }, 'Sent automatically in production. Edit wording under Emails.'),
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close'),
      React.createElement('a', { className: 'b-btn b-accent', href: 'mailto:' + props.booking.customer.email + '?subject=' + encodeURIComponent(r.subject) + '&body=' + encodeURIComponent(r.body) }, React.createElement(Icon, { name: 'mail', size: 16 }), 'Open in email app'))
  },
    React.createElement('div', { className: 'email-prev' },
      React.createElement('div', { className: 'email-meta' },
        React.createElement('div', null, React.createElement('span', null, 'To'), ' ', props.booking.customer.name, ' <', props.booking.customer.email, '>'),
        React.createElement('div', null, React.createElement('span', null, 'Subject'), ' ', React.createElement('b', null, r.subject))),
      React.createElement('div', { className: 'email-body' }, r.body))
  );
}

/* ---------- All-bookings calendar ---------- */
function AdminCalendar(props) {
  var today = Store.todayYmd();
  var _m = React.useState(today.slice(0, 7) + '-01'), anchorS = _m[0], setAnchorS = _m[1];
  var _l = React.useState('all'), lf = _l[0], setLf = _l[1];
  var _d = React.useState(null), detail = _d[0], setDetail = _d[1];
  var anchor = Store.parseYmd(anchorS);
  var year = anchor.getFullYear(), month = anchor.getMonth();
  var first = new Date(year, month, 1);
  var startDow = (first.getDay() + 6) % 7;
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  var listings = Store.listings();

  function act(id, status, lbl, patch) { Store.setBookingStatus(id, status, patch); props.refresh && props.refresh(); setDetail(null); }

  var byDate = {};
  function add(d, ev) { (byDate[d] = byDate[d] || []).push(ev); }
  Store.bookings().forEach(function (b) {
    if (b.status === 'declined' || b.status === 'cancelled') return;
    if (lf !== 'all' && b.listingId !== lf) return;
    var days = Store.datesBetween(b.startDate, b.endDate);
    days.forEach(function (d, i) {
      var pos = days.length === 1 ? 'single' : (i === 0 ? 'start' : (i === days.length - 1 ? 'end' : 'mid'));
      add(d, { booking: b, type: b.status, pos: pos });
    });
  });
  listings.forEach(function (lst) {
    if (lf !== 'all' && lst.id !== lf) return;
    (lst.blocked || []).forEach(function (d) { add(d, { type: 'maint', pos: 'single', mname: lst.name }); });
  });

  var cells = [];
  for (var i = 0; i < startDow; i++) cells.push(null);
  for (var dd = 1; dd <= daysInMonth; dd++) cells.push(Store.ymd(new Date(year, month, dd)));
  function shift(n) { setAnchorS(Store.ymd(new Date(year, month + n, 1))); }
  var evClass = { pending: 'pending', approved: 'approved', paid: 'paid', maint: 'maint' };

  function chip(ev, k) {
    var cls = 'acal-ev ' + (evClass[ev.type] || 'pending') + ' ' + ev.pos;
    if (ev.type === 'maint') return React.createElement('div', { key: k, className: cls, title: (ev.mname || '') + ' — maintenance' }, ev.pos === 'single' ? '🔧 Maintenance' : '');
    var b = ev.booking;
    var lst = Store.getListing(b.listingId) || { name: '?' };
    var spanTxt = b.startDate !== b.endDate ? ' (' + Store.shortDate(b.startDate) + '–' + Store.shortDate(b.endDate) + ')' : '';
    var text = (ev.pos === 'mid' || ev.pos === 'end') ? '' : (lst.name.split(' ')[0] + ' · ' + b.customer.name.split(' ')[0]);
    return React.createElement('div', { key: k, className: cls + ' clickable', title: lst.name + ' — ' + b.customer.name + spanTxt + ' — click to open', onClick: function () { setDetail(b); } }, text);
  }

  return React.createElement('div', { className: 'card card-pad' },
    React.createElement('div', { className: 'cal-head', style: { marginBottom: 16 } },
      React.createElement('b', { style: { fontSize: 20 } }, label),
      React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
        React.createElement('select', { value: lf, onChange: function (e) { setLf(e.target.value); }, style: { fontFamily: 'var(--body)', padding: '8px 10px', border: '1.5px solid var(--line)', borderRadius: 6 } },
          React.createElement('option', { value: 'all' }, 'All vehicles'),
          listings.map(function (l) { return React.createElement('option', { key: l.id, value: l.id }, l.name); })),
        React.createElement('div', { className: 'cal-nav' },
          React.createElement('button', { onClick: function () { shift(-1); } }, React.createElement(Icon, { name: 'chevL', size: 16 })),
          React.createElement('button', { onClick: function () { shift(1); } }, React.createElement(Icon, { name: 'chevR', size: 16 }))))),
    React.createElement('div', { className: 'cal-dow' },
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return React.createElement('span', { key: d }, d); })),
    React.createElement('div', { className: 'acal-grid' },
      cells.map(function (ds, idx) {
        if (!ds) return React.createElement('div', { key: 'e' + idx, className: 'acal-cell empty' });
        var evs = byDate[ds] || [];
        return React.createElement('div', { key: ds, className: 'acal-cell' + (ds === today ? ' today' : '') },
          React.createElement('div', { className: 'dnum' }, Store.parseYmd(ds).getDate()),
          evs.slice(0, 3).map(chip),
          evs.length > 3 && React.createElement('div', { style: { fontSize: 10, color: 'var(--muted)', marginTop: 2 } }, '+', evs.length - 3, ' more'));
      })),
    React.createElement('div', { className: 'cal-legend', style: { marginTop: 14 } },
      React.createElement('span', null, React.createElement('i', { style: { background: '#fde0c4' } }), 'Pending'),
      React.createElement('span', null, React.createElement('i', { style: { background: '#cfe0f7' } }), 'Awaiting payment'),
      React.createElement('span', null, React.createElement('i', { style: { background: '#bfe6cd' } }), 'Confirmed'),
      React.createElement('span', null, React.createElement('i', { style: { background: '#e0c4f0' } }), 'Maintenance'),
      React.createElement('span', { style: { color: 'var(--muted)' } }, 'Multi-day hires show as one connected bar.')),
    detail && React.createElement(BookingDetailModal, { booking: detail, onClose: function () { setDetail(null); }, onAct: act })
  );
}

/* ---------- Fleet / listings manager ---------- */
function ListingsManager(props) {
  var toast = useToast();
  var _e = React.useState(null), editing = _e[0], setEditing = _e[1];
  var listings = Store.listings();
  function del(l) {
    if (!window.confirm('Delete "' + l.name + '"? This also removes its bookings. This cannot be undone.')) return;
    Store.deleteListing(l.id); toast('Listing deleted.', ''); props.refresh();
  }
  function toggleAvail(l) { Store.saveListing(Object.assign({}, l, { available: !l.available })); props.refresh(); }

  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
      React.createElement('p', { style: { color: 'var(--muted)', fontSize: 14, maxWidth: '46ch' } }, 'Each trailer and van is booked out individually. Add items, edit rates and details, upload photos, and block out dates.'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: function () { setEditing('new'); } }, React.createElement(Icon, { name: 'plus', size: 17 }), 'Add item')),
    React.createElement('div', { className: 'adm-list' },
      listings.map(function (l) {
        return React.createElement('div', { key: l.id, className: 'adm-lrow' },
          React.createElement('div', { className: 'alt-thumb' },
            l.photos && l.photos[0] ? React.createElement('img', { src: l.photos[0], alt: '' }) : React.createElement('div', { className: 'ph' }, React.createElement(Icon, { name: l.category === 'van' ? 'van' : 'truck', size: 22 }))),
          React.createElement('div', null,
            React.createElement('h4', null, l.name, React.createElement('span', { className: 'badge badge-' + l.category }, l.category === 'van' ? 'Van' : 'Trailer'), !l.available && React.createElement('span', { className: 'badge badge-cancelled' }, 'Unavailable')),
            React.createElement('div', { className: 'meta' }, '£', l.fullDay, '/day · £', l.halfDay, ' half-day · £', l.deposit, ' deposit · ', (l.blocked || []).length, ' blocked date(s)')),
          React.createElement('div', { className: 'bk-actions' },
            React.createElement('label', { className: 'toggle' },
              React.createElement('input', { type: 'checkbox', checked: l.available, onChange: function () { toggleAvail(l); } }),
              React.createElement('span', { className: 'tr' })),
            React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: function () { setEditing(l); } }, React.createElement(Icon, { name: 'edit', size: 15 }), 'Edit'),
            React.createElement('button', { className: 'b-btn b-danger b-sm', onClick: function () { del(l); } }, React.createElement(Icon, { name: 'trash', size: 15 }))));
      })),
    editing && React.createElement(ListingEditor, { listing: editing === 'new' ? null : editing, onClose: function () { setEditing(null); }, onSaved: function () { setEditing(null); props.refresh(); toast('Listing saved ✓', 'ok'); } })
  );
}

/* ---------- Listing editor modal ---------- */
function ListingEditor(props) {
  var blank = { id: '', category: 'trailer', name: '', blurb: '', description: '', specs: Object.assign({}, SPEC_PRESETS.trailer), electrics: '7-pin', fullDay: 50, halfDay: 30, deposit: 100, photos: [], available: true, blocked: [] };
  var _f = React.useState(props.listing ? JSON.parse(JSON.stringify(props.listing)) : blank), f = _f[0], setF = _f[1];
  var _bd = React.useState(''), blockDate = _bd[0], setBlockDate = _bd[1];
  var _lb = React.useState(null), lb = _lb[0], setLb = _lb[1];
  var _drag = React.useState(null), drag = _drag[0], setDrag = _drag[1];
  var fileRef = React.useRef(null);
  function upd(k, v) { setF(function (p) { return Object.assign({}, p, { [k]: v }); }); }
  function updNum(k) { return function (e) { upd(k, parseInt(e.target.value, 10) || 0); }; }

  function changeCategory(e) {
    var cat = e.target.value;
    setF(function (p) {
      var emptySpecs = !p.specs || Object.keys(p.specs).length === 0;
      var next = Object.assign({}, p, { category: cat });
      // prefill obvious defaults when adding new / specs blank
      if (!props.listing && emptySpecs) next.specs = Object.assign({}, SPEC_PRESETS[cat]);
      else if (!props.listing) next.specs = Object.assign({}, SPEC_PRESETS[cat]);
      if (cat === 'van') next.electrics = '';
      else if (!next.electrics) next.electrics = '7-pin';
      return next;
    });
  }

  function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    files.forEach(function (file) { readImageScaled(file, function (url) { setF(function (prev) { return Object.assign({}, prev, { photos: prev.photos.concat([url]) }); }); }); });
    e.target.value = '';
  }
  function removePhoto(i) { setF(function (p) { return Object.assign({}, p, { photos: p.photos.filter(function (_, k) { return k !== i; }) }); }); }
  function dropPhoto(to) {
    if (drag === null || drag === to) return;
    setF(function (p) { var a = p.photos.slice(); var m = a.splice(drag, 1)[0]; a.splice(to, 0, m); return Object.assign({}, p, { photos: a }); });
    setDrag(null);
  }
  function addBlocked() { if (blockDate && f.blocked.indexOf(blockDate) === -1) { upd('blocked', f.blocked.concat([blockDate]).sort()); setBlockDate(''); } }
  function removeBlocked(d) { upd('blocked', f.blocked.filter(function (x) { return x !== d; })); }

  var specKeys = Object.keys(f.specs || {});
  function setSpec(oldK, newK, val) { var s = {}; specKeys.forEach(function (k) { if (k === oldK) { if (newK) s[newK] = val; } else s[k] = f.specs[k]; }); upd('specs', s); }
  function addSpec() { upd('specs', Object.assign({}, f.specs, { 'New field': '' })); }
  function removeSpec(k) { var s = Object.assign({}, f.specs); delete s[k]; upd('specs', s); }

  function save() { if (!f.name.trim()) { window.alert('Please give the item a name.'); return; } Store.saveListing(f); props.onSaved(); }

  return React.createElement(Modal, {
    title: props.listing ? 'Edit item' : 'Add item', wide: true, onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Cancel'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: save }, React.createElement(Icon, { name: 'check', size: 17 }), 'Save item'))
  },
    React.createElement('div', { className: 'b-row' },
      React.createElement(Field, { label: 'Name', required: true, value: f.name, onChange: function (e) { upd('name', e.target.value); } }),
      React.createElement(Field, { label: 'Category', type: 'select', value: f.category, onChange: changeCategory, options: [{ value: 'trailer', label: 'Trailer' }, { value: 'van', label: 'Van' }] })),
    f.category === 'trailer' && React.createElement(Field, { label: 'Trailer electrics', type: 'select', value: f.electrics || '7-pin', onChange: function (e) { upd('electrics', e.target.value); }, hint: 'The plug type this trailer uses.', options: [{ value: '7-pin', label: '7-pin' }, { value: '13-pin', label: '13-pin' }, { value: '7-pin (13-pin adaptor available)', label: '7-pin + 13-pin adaptor' }] }),
    React.createElement(Field, { label: 'Short blurb (card)', value: f.blurb, onChange: function (e) { upd('blurb', e.target.value); }, placeholder: 'One line shown on the listing card' }),
    React.createElement(Field, { label: 'Full description', type: 'textarea', value: f.description, onChange: function (e) { upd('description', e.target.value); } }),
    React.createElement('div', { className: 'b-row' },
      React.createElement(Field, { label: 'Full-day rate (£)', type: 'number', value: f.fullDay, onChange: updNum('fullDay') }),
      React.createElement(Field, { label: 'Half-day rate (£)', type: 'number', value: f.halfDay, onChange: updNum('halfDay') })),
    React.createElement(Field, { label: 'Refundable deposit (£)', type: 'number', value: f.deposit, onChange: updNum('deposit') }),
    React.createElement('div', { className: 'b-field' },
      React.createElement('label', null, 'Photos ', React.createElement('span', { style: { fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' } }, '— click to enlarge, drag to reorder')),
      React.createElement('div', { className: 'photo-edit' },
        f.photos.map(function (p, i) {
          return React.createElement('div', { key: i, className: 'pe', draggable: true,
            onDragStart: function (e) { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; setDrag(i); }, onDragOver: function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, onDrop: function (e) { e.preventDefault(); dropPhoto(i); } },
            React.createElement('img', { src: p, alt: '', draggable: false, onClick: function () { setLb({ images: f.photos, index: i }); } }),
            i === 0 && React.createElement('span', { className: 'pe-cover' }, 'Cover'),
            React.createElement('button', { onClick: function () { removePhoto(i); }, 'aria-label': 'Remove' }, React.createElement(Icon, { name: 'x', size: 13 })));
        }),
        React.createElement('button', { className: 'photo-add', onClick: function () { fileRef.current.click(); }, type: 'button' }, React.createElement(Icon, { name: 'plus', size: 22 })),
        React.createElement('input', { ref: fileRef, type: 'file', accept: 'image/*', multiple: true, onChange: onFiles, style: { display: 'none' } })),
      React.createElement('div', { className: 'b-hint' }, 'First photo is the cover.')),
    React.createElement('div', { className: 'b-field' },
      React.createElement('label', null, 'Specifications'),
      specKeys.map(function (k) {
        return React.createElement('div', { key: k, style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 } },
          React.createElement('input', { value: k, onChange: function (e) { setSpec(k, e.target.value, f.specs[k]); }, style: { padding: '9px 11px', border: '1.5px solid var(--line)', borderRadius: 6 } }),
          React.createElement('input', { value: f.specs[k], onChange: function (e) { setSpec(k, k, e.target.value); }, style: { padding: '9px 11px', border: '1.5px solid var(--line)', borderRadius: 6 } }),
          React.createElement('button', { className: 'b-btn b-danger b-sm', onClick: function () { removeSpec(k); }, type: 'button' }, React.createElement(Icon, { name: 'trash', size: 14 })));
      }),
      React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: addSpec, type: 'button' }, React.createElement(Icon, { name: 'plus', size: 14 }), 'Add spec')),
    React.createElement('div', { className: 'b-field' },
      React.createElement('label', null, 'Blocked-out dates (maintenance etc.)'),
      React.createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
        React.createElement('input', { type: 'date', value: blockDate, min: Store.todayYmd(), onChange: function (e) { setBlockDate(e.target.value); }, style: { padding: '9px 11px', border: '1.5px solid var(--line)', borderRadius: 6 } }),
        React.createElement('button', { className: 'b-btn b-dark b-sm', onClick: addBlocked, type: 'button' }, 'Block date')),
      React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
        f.blocked.map(function (d) {
          return React.createElement('span', { key: d, className: 'badge badge-cancelled', style: { cursor: 'pointer' }, onClick: function () { removeBlocked(d); } }, Store.shortDate(d), ' ', React.createElement(Icon, { name: 'x', size: 12 }));
        }))),
    React.createElement('label', { className: 'toggle', style: { marginTop: 6 } },
      React.createElement('input', { type: 'checkbox', checked: f.available, onChange: function (e) { upd('available', e.target.checked); } }),
      React.createElement('span', { className: 'tr' }), 'Available for booking'),
    lb && React.createElement(Lightbox, { images: lb.images, index: lb.index, onClose: function () { setLb(null); } })
  );
}

/* ---------- Gallery manager (enlarge + drag reorder) ---------- */
function GalleryManager(props) {
  var toast = useToast();
  var fileRef = React.useRef(null);
  var photos = Store.gallery();
  var _lb = React.useState(null), lb = _lb[0], setLb = _lb[1];
  var _drag = React.useState(null), drag = _drag[0], setDrag = _drag[1];
  function onFiles(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    var n = 0;
    files.forEach(function (file) { readImageScaled(file, function (url) { Store.addGalleryPhoto(url); n++; if (n === files.length) { toast(n + ' photo(s) added ✓', 'ok'); props.refresh(); } }); });
    e.target.value = '';
  }
  function remove(src) { if (window.confirm('Remove this photo from the gallery?')) { Store.removeGalleryPhoto(src); props.refresh(); } }
  function drop(to) {
    if (drag === null || drag === to) return;
    var a = photos.slice(); var m = a.splice(drag, 1)[0]; a.splice(to, 0, m);
    Store.setGallery(a); setDrag(null); props.refresh();
  }
  return React.createElement('div', null,
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 } },
      React.createElement('p', { style: { color: 'var(--muted)', fontSize: 14, maxWidth: '52ch' } }, 'These photos power the website gallery. Click to enlarge, drag to reorder. (', photos.length, ' photos)'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: function () { fileRef.current.click(); } }, React.createElement(Icon, { name: 'plus', size: 17 }), 'Upload photos'),
      React.createElement('input', { ref: fileRef, type: 'file', accept: 'image/*', multiple: true, onChange: onFiles, style: { display: 'none' } })),
    React.createElement('div', { className: 'gm-grid' },
      React.createElement('button', { className: 'gm-add', onClick: function () { fileRef.current.click(); } }, React.createElement(Icon, { name: 'plus', size: 28 }), 'Add photos'),
      photos.map(function (src, i) {
        return React.createElement('div', { key: src + i, className: 'gm-item', draggable: true,
          onDragStart: function (e) { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; setDrag(i); }, onDragOver: function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, onDrop: function (e) { e.preventDefault(); drop(i); } },
          React.createElement('img', { src: src, alt: '', loading: 'lazy', draggable: false, onClick: function () { setLb({ images: photos, index: i }); } }),
          React.createElement('button', { onClick: function () { remove(src); }, 'aria-label': 'Remove' }, React.createElement(Icon, { name: 'trash', size: 15 })));
      })),
    lb && React.createElement(Lightbox, { images: lb.images, index: lb.index, onClose: function () { setLb(null); } })
  );
}

/* ---------- Customers list (with edit + password reset) ---------- */
function CustomersView(props) {
  var _d = React.useState(null), detail = _d[0], setDetail = _d[1];
  var _a = React.useState(false), adding = _a[0], setAdding = _a[1];
  var customers = Store.allUsers().slice().sort(function (a, b) { return (a.role === 'admin' ? -1 : 0) - (b.role === 'admin' ? -1 : 0); });
  var addBtn = React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 14 } },
    React.createElement('button', { className: 'b-btn b-accent', onClick: function () { setAdding(true); } }, React.createElement(Icon, { name: 'plus', size: 16 }), 'Add user'));
  if (!customers.length) return React.createElement('div', null, addBtn, React.createElement('div', { className: 'empty' }, React.createElement(Icon, { name: 'user', size: 54, sw: 1.3 }), React.createElement('h3', null, 'No customers yet'), React.createElement('p', null, 'Accounts will appear here as people sign up.')), adding && React.createElement(AddUserModal, { onClose: function () { setAdding(false); }, refresh: props.refresh }));
  return React.createElement('div', null,
    addBtn,
    React.createElement('div', { className: 'cust-list' },
      customers.map(function (u) {
        var bks = Store.bookingsForUser(u.id);
        var confirmed = bks.filter(function (b) { return b.status === 'paid'; }).length;
        return React.createElement('div', { key: u.id, className: 'cust-row' },
          React.createElement(Avatar, { name: u.name }),
          React.createElement('div', { className: 'cust-meta' },
            React.createElement('h4', null, u.name, u.role === 'admin' ? React.createElement('span', { className: 'badge badge-van', style: { marginLeft: 8 } }, 'Admin') : null),
            React.createElement('div', { className: 'cust-contact' },
              React.createElement('a', { href: 'mailto:' + u.email }, u.email),
              React.createElement('span', null, ' · '),
              React.createElement('a', { href: 'tel:' + (u.phone || '').replace(/\s/g, '') }, u.phone || 'No phone'))),
          React.createElement('div', { className: 'cust-stat' }, React.createElement('b', null, bks.length), React.createElement('span', null, 'bookings')),
          React.createElement('div', { className: 'cust-stat' }, React.createElement('b', null, confirmed), React.createElement('span', null, 'confirmed')),
          React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: function () { setDetail(u); } }, 'Manage'));
      })),
    detail && React.createElement(CustomerModal, { user: detail, onClose: function () { setDetail(null); }, refresh: props.refresh }),
    adding && React.createElement(AddUserModal, { onClose: function () { setAdding(false); }, refresh: props.refresh })
  );
}

function CustomerModal(props) {
  var toast = useToast();
  var u = props.user;
  var _ed = React.useState(false), editing = _ed[0], setEditing = _ed[1];
  var _f = React.useState({ name: u.name, email: u.email, phone: u.phone || '' }), f = _f[0], setF = _f[1];
  function upd(k) { return function (e) { setF(Object.assign({}, f, { [k]: e.target.value })); }; }
  var bks = Store.bookingsForUser(u.id).sort(function (a, b) { return b.createdAt - a.createdAt; });

  function saveEdit() {
    var res = Store.updateUser(u.id, { name: f.name, email: f.email, phone: f.phone });
    if (res.error) { toast(res.error, 'err'); return; }
    toast('Customer updated ✓', 'ok'); setEditing(false); props.refresh();
  }
  function resetPw() {
    Promise.resolve(Store.sendPasswordReset(u.id)).then(function (res) {
      if (res.error) { toast(res.error, 'err'); return; }
      toast('Password reset email sent to ' + res.email, 'ok');
    });
  }
  function toggleRole() {
    var me = Store.currentUser();
    if (me && me.id === u.id) { toast('You can\u2019t change your own role.', 'err'); return; }
    var makeAdmin = u.role !== 'admin';
    if (!window.confirm(makeAdmin ? 'Make ' + u.name + ' an administrator? They\u2019ll get full access to the admin panel.' : 'Remove admin access from ' + u.name + '?')) return;
    var res = Store.updateUser(u.id, { role: makeAdmin ? 'admin' : 'customer' });
    if (res.error) { toast(res.error, 'err'); return; }
    toast(makeAdmin ? u.name + ' is now an admin \u2713' : u.name + ' is now a customer', 'ok');
    props.refresh(); props.onClose();
  }

  return React.createElement(Modal, { title: u.name, onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('button', { className: u.role === 'admin' ? 'b-btn b-danger' : 'b-btn b-ghost', onClick: toggleRole, style: { marginRight: 'auto' } }, React.createElement(Icon, { name: 'user', size: 16 }), u.role === 'admin' ? 'Remove admin' : 'Make admin'),
      React.createElement('button', { className: 'b-btn b-ghost', onClick: resetPw }, React.createElement(Icon, { name: 'logout', size: 16 }), 'Send password reset'),
      editing
        ? React.createElement('button', { className: 'b-btn b-accent', onClick: saveEdit }, React.createElement(Icon, { name: 'check', size: 16 }), 'Save changes')
        : React.createElement('button', { className: 'b-btn b-dark', onClick: function () { setEditing(true); } }, React.createElement(Icon, { name: 'edit', size: 16 }), 'Edit details'))
  },
    editing
      ? React.createElement('div', { style: { marginBottom: 12 } },
        React.createElement(Field, { label: 'Name', value: f.name, onChange: upd('name') }),
        React.createElement(Field, { label: 'Email', type: 'email', value: f.email, onChange: upd('email') }),
        React.createElement(Field, { label: 'Phone', type: 'tel', value: f.phone, onChange: upd('phone') }))
      : React.createElement('div', { className: 'kv', style: { marginBottom: 18 } },
        React.createElement('div', { className: 'kvrow' }, React.createElement('b', null, 'Email'), React.createElement('span', null, u.email)),
        React.createElement('div', { className: 'kvrow' }, React.createElement('b', null, 'Phone'), React.createElement('span', null, u.phone || '—')),
        React.createElement('div', { className: 'kvrow' }, React.createElement('b', null, 'Joined'), React.createElement('span', null, Store.prettyDate(Store.ymd(new Date(u.createdAt)))))),
    React.createElement('h4', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 15, marginBottom: 10 } }, 'Booking history (', bks.length, ')'),
    !bks.length
      ? React.createElement('p', { style: { color: 'var(--muted)', fontSize: 14 } }, 'No bookings yet.')
      : React.createElement('div', { style: { display: 'grid', gap: 8 } },
        bks.map(function (b) {
          var l = Store.getListing(b.listingId) || { name: 'Removed item' };
          var single = b.startDate === b.endDate;
          return React.createElement('div', { key: b.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 7 } },
            React.createElement('div', null,
              React.createElement('b', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 14 } }, l.name),
              React.createElement('div', { style: { fontSize: 13, color: 'var(--muted)' } }, single ? Store.shortDate(b.startDate) : Store.shortDate(b.startDate) + ' → ' + Store.shortDate(b.endDate), ' · £', b.price)),
            React.createElement(Badge, { kind: b.status, dot: true }));
        }))
  );
}

/* ---------- Submissions manager (reviews & photos) ---------- */
function SubmissionsManager(props) {
  var toast = useToast();
  var _f = React.useState('pending'), filter = _f[0], setFilter = _f[1];
  var _lb = React.useState(null), lb = _lb[0], setLb = _lb[1];
  var all = Store.submissions();
  var shown = all.filter(function (s) { return filter === 'all' || s.status === filter; });
  function act(id, status, label) { Store.setSubmissionStatus(id, status); toast(label, status === 'approved' ? 'ok' : ''); props.refresh(); }

  return React.createElement('div', null,
    React.createElement('div', { className: 'seg', style: { marginBottom: 18 } },
      [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(function (c) {
        return React.createElement('button', { key: c[0], className: 'seg-btn' + (filter === c[0] ? ' on' : ''), onClick: function () { setFilter(c[0]); } }, c[1]);
      })),
    !shown.length
      ? React.createElement('div', { className: 'empty' }, React.createElement(Icon, { name: 'image', size: 54, sw: 1.3 }), React.createElement('h3', null, 'Nothing here'), React.createElement('p', null, 'No ', filter, ' submissions.'))
      : React.createElement('div', { className: 'sub-grid' },
        shown.map(function (s) {
          return React.createElement('div', { key: s.id, className: 'card card-pad sub-card' },
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } }, React.createElement(Avatar, { name: s.userName }),
                React.createElement('div', null, React.createElement('b', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 15 } }, s.userName, s.anonymous ? React.createElement('span', { className: 'paytag cash', style: { marginLeft: 6 } }, 'Anonymous') : null),
                  React.createElement('div', { style: { fontSize: 12, color: 'var(--muted)' } }, s.listingName || 'General'))),
              React.createElement(Badge, { kind: s.status === 'rejected' ? 'declined' : s.status === 'approved' ? 'paid' : 'pending', dot: true }, s.status)),
            s.rating ? React.createElement('div', { style: { marginTop: 10 } }, React.createElement(Stars, { value: s.rating })) : null,
            s.text ? React.createElement('p', { style: { fontSize: 14.5, marginTop: 8, color: 'var(--ink-2)', lineHeight: 1.5 } }, '“', s.text, '”') : null,
            s.photos && s.photos.length ? React.createElement('div', { className: 'sub-photos' },
              s.photos.map(function (p, i) { return React.createElement('button', { key: i, className: 'sub-photo', onClick: function () { setLb({ images: s.photos, index: i }); } }, React.createElement('img', { src: p, alt: '', loading: 'lazy' }), React.createElement('span', { className: 'sub-photo-zoom' }, React.createElement(Icon, { name: 'image', size: 16 }))); })) : null,
            React.createElement('div', { className: 'bk-actions', style: { marginTop: 14, justifyContent: 'flex-start' } },
              s.status !== 'approved' && React.createElement('button', { className: 'b-btn b-ok b-sm', onClick: function () { act(s.id, 'approved', 'Published ✓'); } }, React.createElement(Icon, { name: 'check', size: 15 }), 'Approve & publish'),
              s.status !== 'rejected' && React.createElement('button', { className: 'b-btn b-danger b-sm', onClick: function () { act(s.id, 'rejected', 'Submission rejected.'); } }, 'Reject')));
        })),
    lb && React.createElement(Lightbox, { images: lb.images, index: lb.index, onClose: function () { setLb(null); } })
  );
}

/* ---------- Email template manager ---------- */
function EmailManager(props) {
  var toast = useToast();
  var settings = Store.getSettings();
  var _t = React.useState('approval'), which = _t[0], setWhich = _t[1];
  var _d = React.useState(JSON.parse(JSON.stringify(settings.templates))), draft = _d[0], setDraft = _d[1];
  var tpl = draft[which];
  function upd(k, v) { setDraft(Object.assign({}, draft, { [which]: Object.assign({}, tpl, { [k]: v }) })); }
  function save() { Store.saveTemplate(which, draft[which]); toast('Template saved ✓', 'ok'); props.refresh(); }

  var sample = Store.bookings()[0] || { id: 'sample', customer: { name: 'Jane Smith', email: 'jane@example.com' }, listingId: Store.listings()[0] && Store.listings()[0].id, startDate: Store.todayYmd(), endDate: Store.addDays(Store.todayYmd(), 2), period: 'full', price: 130, deposit: 150, fulfilment: 'collection', paymentMethod: which === 'confirmation' ? 'cash' : 'card' };
  var rendered = (function () {
    var saved = Store.getSettings().templates[which];
    Store.getSettings().templates[which] = draft[which];
    var r = Store.renderTemplate(which, sample);
    Store.getSettings().templates[which] = saved;
    return r;
  })();
  var fields = ['customer', 'item', 'start', 'end', 'period', 'price', 'deposit', 'total', 'delivery', 'deliverynote', 'paymentnote', 'paylink', 'fulfilment', 'phone', 'email'];
  var tabsT = [['approval', 'Payment request (card)'], ['confirmation', 'Confirmation / welcome'], ['reminder', 'End-of-hire reminder']];

  return React.createElement('div', null,
    React.createElement('p', { style: { color: 'var(--muted)', fontSize: 14, marginBottom: 14, maxWidth: '64ch' } }, 'Edit the automatic emails. The ', React.createElement('b', null, 'payment request'), ' goes out when you approve a card booking; the ', React.createElement('b', null, 'confirmation'), ' goes out once paid (or straight away for cash); the ', React.createElement('b', null, 'reminder'), ' goes out near the end of the hire. Merge fields fill in per booking.'),
    React.createElement('div', { className: 'seg', style: { marginBottom: 18, flexWrap: 'wrap' } },
      tabsT.map(function (t) { return React.createElement('button', { key: t[0], className: 'seg-btn' + (which === t[0] ? ' on' : ''), onClick: function () { setWhich(t[0]); } }, t[1]); })),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, alignItems: 'start' }, className: 'share-grid' },
      React.createElement('div', { className: 'card card-pad' },
        React.createElement(Field, { label: 'Subject line', value: tpl.subject, onChange: function (e) { upd('subject', e.target.value); } }),
        React.createElement(Field, { label: 'Email body', type: 'textarea', value: tpl.body, onChange: function (e) { upd('body', e.target.value); }, rows: 16 }),
        React.createElement('div', { className: 'b-field' },
          React.createElement('label', null, 'Merge fields (click to copy)'),
          React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            fields.map(function (fl) {
              return React.createElement('button', { key: fl, type: 'button', className: 'mergechip', onClick: function () { try { navigator.clipboard.writeText('{{' + fl + '}}'); toast('Copied {{' + fl + '}}', ''); } catch (e) {} } }, '{{', fl, '}}');
            }))),
        React.createElement('button', { className: 'b-btn b-accent', onClick: save }, React.createElement(Icon, { name: 'check', size: 16 }), 'Save template')),
      React.createElement('div', null,
        React.createElement('h3', { style: { fontFamily: 'var(--head)', fontWeight: 800, textTransform: 'uppercase', fontSize: 16, marginBottom: 10 } }, 'Live preview'),
        React.createElement('div', { className: 'email-prev' },
          React.createElement('div', { className: 'email-meta' },
            React.createElement('div', null, React.createElement('span', null, 'Subject'), ' ', React.createElement('b', null, rendered.subject))),
          React.createElement('div', { className: 'email-body' }, rendered.body))))
  );
}

function AddUserModal(props) {
  var toast = useToast();
  var _f = React.useState({ name: '', email: '', phone: '', password: '', role: 'customer' }), f = _f[0], setF = _f[1];
  function upd(k) { return function (e) { setF(Object.assign({}, f, { [k]: e.target.value })); }; }
  function save() {
    Promise.resolve(Store.adminCreateUser(f)).then(function (res) {
      if (res.error) { toast(res.error, 'err'); return; }
      toast(f.role === 'admin' ? 'Admin account created ✓' : 'Customer account created ✓', 'ok');
      props.refresh(); props.onClose();
    });
  }
  return React.createElement(Modal, { title: 'Add user', onClose: props.onClose,
    footer: React.createElement(React.Fragment, null,
      React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Cancel'),
      React.createElement('button', { className: 'b-btn b-accent', onClick: save }, React.createElement(Icon, { name: 'check', size: 16 }), 'Create user')) },
    React.createElement(Field, { label: 'Name', required: true, value: f.name, onChange: upd('name') }),
    React.createElement(Field, { label: 'Email', type: 'email', required: true, value: f.email, onChange: upd('email') }),
    React.createElement(Field, { label: 'Phone', type: 'tel', value: f.phone, onChange: upd('phone') }),
    React.createElement(Field, { label: 'Temporary password', required: true, value: f.password, onChange: upd('password'), hint: 'Share this with them; they can change it under their profile.' }),
    React.createElement(Field, { label: 'Role', type: 'select', value: f.role, onChange: upd('role'), options: [{ value: 'customer', label: 'Customer' }, { value: 'admin', label: 'Administrator (full access)' }] })
  );
}

Object.assign(window, { AdminDashboard: AdminDashboard });
