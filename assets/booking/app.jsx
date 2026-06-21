/* ============================================================
   App root — auth gating, top bar, routing between
   customer + admin views.
   ============================================================ */
function TopBar(props) {
  var u = props.user;
  var _m = React.useState(false), open = _m[0], setOpen = _m[1];
  var _p = React.useState(false), profile = _p[0], setProfile = _p[1];
  var isAdmin = u.role === 'admin';
  var tabs = isAdmin
    ? [{ id: 'admin', label: 'Admin', icon: 'settings' }, { id: 'browse', label: 'Vehicles', icon: 'truck' }]
    : [{ id: 'browse', label: 'Vehicles', icon: 'truck' }, { id: 'mine', label: 'My bookings', icon: 'cal' }, { id: 'share', label: 'Share a trip', icon: 'image' }];
  return React.createElement('header', { className: 'app-header' },
    React.createElement('div', { className: 'app-nav' },
      React.createElement('a', { href: 'index.html', className: 'app-back', title: 'Back to website' },
        React.createElement(Icon, { name: 'back', size: 15 }), React.createElement('span', null, 'Website')),
      React.createElement('a', { href: 'index.html', className: 'app-brand' },
        React.createElement('b', null, 'SUSSEX ', React.createElement('span', null, 'V&T'), ' HIRE'),
        React.createElement('small', null, 'Booking portal')),
      React.createElement('button', { className: 'app-menu-btn', onClick: function () { setOpen(!open); }, 'aria-label': 'Menu' }, React.createElement(Icon, { name: open ? 'x' : 'grid', size: 24 })),
      React.createElement('nav', { className: 'app-tabs' + (open ? ' open' : '') },
        tabs.map(function (t) {
          return React.createElement('button', { key: t.id, className: 'app-tab' + (props.route === t.id ? ' active' : ''), onClick: function () { setOpen(false); props.onRoute(t.id); } },
            React.createElement(Icon, { name: t.icon, size: 16 }), t.label,
            t.id === 'admin' && props.pending ? React.createElement('span', { className: 'pill' }, props.pending) : null);
        })),
      React.createElement('div', { className: 'app-user' },
        React.createElement('button', { className: 'app-userbtn', onClick: function () { setProfile(true); }, title: 'Your profile' },
          React.createElement('div', { className: 'who' },
            React.createElement('b', null, u.name.split(' ')[0]),
            React.createElement('small', null, isAdmin ? 'Administrator' : 'Customer')),
          React.createElement(Avatar, { name: u.name, admin: isAdmin })),
        React.createElement('button', { className: 'b-btn b-ghost b-sm', onClick: props.onLogout, title: 'Sign out', style: { padding: 9 } }, React.createElement(Icon, { name: 'logout', size: 16 }))),
      profile && React.createElement(ProfileModal, { user: u, onClose: function () { setProfile(false); }, onUpdated: props.onProfileUpdated })
    ));
}

function ProfileModal(props) {
  var toast = useToast();
  var u = props.user;
  var _f = React.useState({ name: u.name, email: u.email, phone: u.phone || '' }), f = _f[0], setF = _f[1];
  var _pw = React.useState({ current: '', next: '' }), pw = _pw[0], setPw = _pw[1];
  function upd(k) { return function (e) { setF(Object.assign({}, f, { [k]: e.target.value })); }; }
  function updPw(k) { return function (e) { setPw(Object.assign({}, pw, { [k]: e.target.value })); }; }
  function saveDetails() {
    var res = Store.updateUser(u.id, { name: f.name, email: f.email, phone: f.phone });
    if (res.error) { toast(res.error, 'err'); return; }
    toast('Profile updated \u2713', 'ok'); props.onUpdated && props.onUpdated(Store.currentUser());
  }
  function savePw() {
    if (!pw.current || !pw.next) { toast('Fill in both password fields.', 'err'); return; }
    Promise.resolve(Store.changePassword(u.id, pw.current, pw.next)).then(function (res) {
      if (res.error) { toast(res.error, 'err'); return; }
      setPw({ current: '', next: '' }); toast('Password changed \u2713', 'ok');
    });
  }
  return React.createElement(Modal, { title: 'Your profile', onClose: props.onClose,
    footer: React.createElement('button', { className: 'b-btn b-ghost', onClick: props.onClose }, 'Close') },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 } },
      React.createElement(Avatar, { name: u.name, admin: u.role === 'admin' }),
      React.createElement('div', null,
        React.createElement('b', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase' } }, u.name),
        React.createElement('div', { style: { fontSize: 13, color: 'var(--muted)' } }, u.role === 'admin' ? 'Administrator' : 'Customer'))),
    React.createElement('h4', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 14, margin: '4px 0 10px' } }, 'Your details'),
    React.createElement(Field, { label: 'Name', value: f.name, onChange: upd('name') }),
    React.createElement(Field, { label: 'Email', type: 'email', value: f.email, onChange: upd('email') }),
    React.createElement(Field, { label: 'Phone', type: 'tel', value: f.phone, onChange: upd('phone') }),
    React.createElement('button', { className: 'b-btn b-accent b-sm', onClick: saveDetails }, React.createElement(Icon, { name: 'check', size: 15 }), 'Save details'),
    React.createElement('h4', { style: { fontFamily: 'var(--head)', textTransform: 'uppercase', fontSize: 14, margin: '22px 0 10px', paddingTop: 16, borderTop: '1px solid var(--line)' } }, 'Change password'),
    React.createElement(Field, { label: 'Current password', type: 'password', value: pw.current, onChange: updPw('current') }),
    React.createElement(Field, { label: 'New password', type: 'password', value: pw.next, onChange: updPw('next') }),
    React.createElement('button', { className: 'b-btn b-dark b-sm', onClick: savePw }, React.createElement(Icon, { name: 'check', size: 15 }), 'Update password')
  );
}

function App() {
  var _u = React.useState(Store.currentUser()), user = _u[0], setUser = _u[1];
  var _r = React.useState(null), route = _r[0], setRoute = _r[1];
  var _o = React.useState(null), openListing = _o[0], setOpenListing = _o[1];
  var _t = React.useState(0), tick = _t[0], setTick = _t[1];
  var refresh = React.useCallback(function () { setTick(function (t) { return t + 1; }); }, []);

  React.useEffect(function () { return Store.subscribe(refresh); }, [refresh]);

  // default route per role
  React.useEffect(function () {
    if (user && !route) setRoute(user.role === 'admin' ? 'admin' : 'browse');
  }, [user, route]);

  if (!user) {
    return React.createElement(AuthView, { onAuthed: function (u) { setUser(u); setRoute(u.role === 'admin' ? 'admin' : 'browse'); } });
  }

  function logout() { Store.logout(); setUser(null); setRoute(null); setOpenListing(null); }
  function goRoute(r) { setOpenListing(null); setRoute(r); }

  var pending = Store.stats().pending;

  var body;
  if (openListing) {
    body = React.createElement(ListingDetail, {
      id: openListing, user: user,
      onBack: function () { setOpenListing(null); },
      onBooked: function () { setOpenListing(null); setRoute(user.role === 'admin' ? 'admin' : 'mine'); }
    });
  } else if (route === 'admin') {
    body = React.createElement(AdminDashboard, { refresh: refresh });
  } else if (route === 'mine') {
    body = React.createElement(MyBookings, { user: user, refresh: refresh, onBrowse: function () { setRoute('browse'); } });
  } else if (route === 'share') {
    body = React.createElement(ShareTrip, { user: user, refresh: refresh });
  } else {
    body = React.createElement(BrowseView, { onOpen: function (id) { setOpenListing(id); } });
  }

  return React.createElement(React.Fragment, null,
    React.createElement(TopBar, { user: user, route: openListing ? null : route, onRoute: goRoute, onLogout: logout, pending: pending, onProfileUpdated: function (uu) { if (uu) setUser(uu); } }),
    React.createElement('main', { className: 'app-main' }, body)
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ToastProvider, null, React.createElement(BootGate, null))
);

// Boots the app once the live data layer has hydrated from Supabase
// (falls back instantly if a synchronous prototype store is in use).
function BootGate() {
  var _r = React.useState(!Store.init), ready = _r[0], setReady = _r[1];
  var _e = React.useState(null), err = _e[0], setErr = _e[1];
  React.useEffect(function () {
    if (!Store.init) return;
    Store.init().then(function () { setReady(true); }).catch(function (e) { console.error(e); setErr(e); });
  }, []);
  if (err) return React.createElement('div', { className: 'boot-msg' }, React.createElement('b', null, 'Couldn\u2019t reach the booking service'), React.createElement('p', null, 'Please check your connection and refresh the page.'));
  if (!ready) return React.createElement('div', { className: 'boot-msg' }, React.createElement('div', { className: 'boot-spinner' }), React.createElement('p', null, 'Loading\u2026'));
  return React.createElement(App, null);
}
