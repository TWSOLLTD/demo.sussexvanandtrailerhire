/* ============================================================
   Auth view — sign up / sign in (gates the booking app)
   ============================================================ */
function AuthView(props) {
  var _t = React.useState('signin'), tab = _t[0], setTab = _t[1];
  var _e = React.useState(''), err = _e[0], setErr = _e[1];
  var _n = React.useState(''), notice = _n[0], setNotice = _n[1];
  var _f = React.useState({ name: '', email: '', phone: '', password: '' }), form = _f[0], setForm = _f[1];
  var _b = React.useState(false), busy = _b[0], setBusy = _b[1];
  function upd(k) { return function (e) { setForm(Object.assign({}, form, { [k]: e.target.value })); }; }

  function submit(e) {
    e.preventDefault();
    setErr(''); setNotice('');
    setBusy(true);
    var p = tab === 'signup' ? Store.signup(form) : Store.login(form.email, form.password);
    Promise.resolve(p).then(function (res) {
      setBusy(false);
      if (res.error) { setErr(res.error); return; }
      if (res.pending) { setNotice(res.message); setTab('signin'); return; }
      props.onAuthed(res.user);
    });
  }
  function fillDemo(kind) {
    if (kind === 'admin') setForm({ name: '', email: 'admin@sussexvanandtrailerhire.co.uk', phone: '', password: '' });
    else setForm({ name: '', email: 'demo@example.com', phone: '', password: '' });
    setTab('signin'); setErr('');
  }

  return React.createElement('div', { className: 'auth-wrap' },
    // left brand panel
    React.createElement('div', { className: 'auth-side' },
      React.createElement('div', { className: 'as-bg' },
        React.createElement('img', { src: 'assets/gallery/p59.webp', alt: '' })),
      React.createElement('a', { href: 'index.html', className: 'auth-back' },
        React.createElement(Icon, { name: 'back', size: 15 }), 'Back to website'),
      React.createElement('div', null,
        React.createElement('div', { className: 'as-brand' },
          React.createElement('b', null, 'SUSSEX ', React.createElement('span', null, 'VAN & TRAILER'), ' HIRE'),
          React.createElement('small', null, 'Rustington · Littlehampton')),
        React.createElement('h2', { style: { marginTop: 30 } }, 'Book your ', React.createElement('em', null, 'trailer or van'), ' online'),
        React.createElement('p', null, 'Create an account to check live availability, request your dates and track your booking — all in one place.'),
        React.createElement('ul', { className: 'as-feats' },
          ['Live availability calendar', 'Half-day & full-day hire', 'Trailers & vans in one place', 'Track your booking status'].map(function (f) {
            return React.createElement('li', { key: f }, React.createElement(Icon, { name: 'check', size: 18 }), f);
          }))),
      React.createElement('div', { style: { fontSize: 13, color: '#9fb0c4' } }, '© ', new Date().getFullYear(), ' Sussex Van & Trailer Hire')
    ),
    // right form
    React.createElement('div', { className: 'auth-form-wrap' },
      React.createElement('div', { className: 'auth-card' },
        React.createElement('h1', null, tab === 'signup' ? 'Create account' : 'Welcome back'),
        React.createElement('p', { className: 'sub' }, tab === 'signup' ? 'Just a few details to get you booking.' : 'Sign in to manage your bookings.'),
        React.createElement('div', { className: 'auth-toggle' },
          React.createElement('button', { className: tab === 'signin' ? 'on' : '', onClick: function () { setTab('signin'); setErr(''); setNotice(''); } }, 'Sign in'),
          React.createElement('button', { className: tab === 'signup' ? 'on' : '', onClick: function () { setTab('signup'); setErr(''); setNotice(''); } }, 'Sign up')),
        notice && React.createElement('div', { className: 'b-notice' }, React.createElement(Icon, { name: 'mail', size: 16 }), notice),
        err && React.createElement('div', { className: 'b-error' }, err),
        React.createElement('form', { onSubmit: submit },
          tab === 'signup' && React.createElement(Field, { label: 'Full name', required: true, value: form.name, onChange: upd('name'), placeholder: 'Jane Smith', autoComplete: 'name' }),
          React.createElement(Field, { label: 'Email', type: 'email', required: true, value: form.email, onChange: upd('email'), placeholder: 'you@email.com', autoComplete: 'email' }),
          tab === 'signup' && React.createElement(Field, { label: 'Mobile number', type: 'tel', value: form.phone, onChange: upd('phone'), placeholder: '07…', autoComplete: 'tel' }),
          React.createElement(Field, { label: 'Password', type: 'password', required: true, value: form.password, onChange: upd('password'), placeholder: '••••••••', autoComplete: tab === 'signup' ? 'new-password' : 'current-password' }),
          React.createElement('button', { type: 'submit', className: 'b-btn b-accent b-block', style: { marginTop: 6 }, disabled: busy },
            busy ? 'Please wait\u2026' : (tab === 'signup' ? 'Create account' : 'Sign in'), React.createElement(Icon, { name: 'arrow', size: 17 }))),
        React.createElement('div', { className: 'auth-demo' },
          React.createElement('b', null, 'New here?'), ' Create an account in seconds — you\u2019ll be able to check live availability and request your dates straight away.')
      ))
  );
}
Object.assign(window, { AuthView: AuthView });
