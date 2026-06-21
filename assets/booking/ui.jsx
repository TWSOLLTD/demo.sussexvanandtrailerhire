/* ============================================================
   Shared UI primitives — icons, buttons, fields, modal,
   calendar, badges, toast. Exposed on window for other files.
   ============================================================ */

/* ---------- Icons ---------- */
function Icon(props) {
  var paths = {
    arrow: 'M5 12h14M12 5l7 7-7 7',
    back: 'M19 12H5M12 19l-7-7 7-7',
    chevL: 'M15 18l-6-6 6-6',
    chevR: 'M9 18l6-6-6-6',
    chevD: 'M6 9l6 6 6-6',
    x: 'M18 6L6 18M6 6l12 12',
    check: 'M20 6L9 17l-5-5',
    plus: 'M12 5v14M5 12h14',
    trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    van: 'M1 16V5a1 1 0 0 1 1-1h12v12M14 8h4l3 4v4h-3M6.5 19.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM17.5 19.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    cart: 'M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6'
  };
  var d = paths[props.name] || '';
  var multi = d.indexOf('M') !== d.lastIndexOf('M');
  return React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: props.sw || 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    width: props.size || 18, height: props.size || 18, style: props.style
  }, React.createElement('path', { d: d }));
}

/* ---------- Field ---------- */
function Field(props) {
  var id = props.id || 'f_' + props.label;
  var input;
  if (props.type === 'textarea') {
    input = React.createElement('textarea', { id: id, value: props.value, placeholder: props.placeholder, onChange: props.onChange, rows: props.rows });
  } else if (props.type === 'select') {
    input = React.createElement('select', { id: id, value: props.value, onChange: props.onChange },
      props.options.map(function (o) {
        var val = typeof o === 'string' ? o : o.value;
        var lab = typeof o === 'string' ? o : o.label;
        return React.createElement('option', { key: val, value: val }, lab);
      }));
  } else {
    input = React.createElement('input', { id: id, type: props.type || 'text', value: props.value, placeholder: props.placeholder, onChange: props.onChange, autoComplete: props.autoComplete });
  }
  return React.createElement('div', { className: 'b-field' },
    props.label && React.createElement('label', { htmlFor: id },
      props.label, props.required && React.createElement('span', { className: 'req' }, ' *')),
    input,
    props.hint && React.createElement('div', { className: 'b-hint' }, props.hint)
  );
}

/* ---------- Badge ---------- */
function Badge(props) {
  var map = { pending: 'Pending', approved: 'Awaiting payment', paid: 'Confirmed', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled', rejected: 'Rejected' };
  return React.createElement('span', { className: 'badge badge-' + props.kind },
    props.dot && React.createElement('span', { className: 'd' }),
    props.children || map[props.kind] || props.kind);
}

/* ---------- Modal ---------- */
function Modal(props) {
  React.useEffect(function () {
    function esc(e) { if (e.key === 'Escape') props.onClose(); }
    document.addEventListener('keydown', esc);
    return function () { document.removeEventListener('keydown', esc); };
  }, []);
  return React.createElement('div', { className: 'modal-back', onMouseDown: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
    React.createElement('div', { className: 'modal' + (props.wide ? ' wide' : '') },
      React.createElement('div', { className: 'modal-head' },
        React.createElement('h3', null, props.title),
        React.createElement('button', { className: 'modal-x', onClick: props.onClose, 'aria-label': 'Close' }, React.createElement(Icon, { name: 'x', size: 20 }))),
      React.createElement('div', { className: 'modal-body' }, props.children),
      props.footer && React.createElement('div', { className: 'modal-foot' }, props.footer)
    ));
}

/* ---------- Toast ---------- */
var ToastCtx = React.createContext(function () {});
function ToastProvider(props) {
  var _a = React.useState([]), toasts = _a[0], setToasts = _a[1];
  var push = React.useCallback(function (msg, kind) {
    var id = Math.random();
    setToasts(function (t) { return t.concat([{ id: id, msg: msg, kind: kind || '' }]); });
    setTimeout(function () { setToasts(function (t) { return t.filter(function (x) { return x.id !== id; }); }); }, 3200);
  }, []);
  return React.createElement(ToastCtx.Provider, { value: push },
    props.children,
    React.createElement('div', { className: 'toast-wrap' },
      toasts.map(function (t) {
        return React.createElement('div', { key: t.id, className: 'toast ' + t.kind },
          t.kind === 'ok' && React.createElement(Icon, { name: 'check', size: 18 }),
          t.kind === 'err' && React.createElement(Icon, { name: 'x', size: 18 }),
          t.msg);
      })));
}
function useToast() { return React.useContext(ToastCtx); }

/* ---------- downscale uploaded images before storing ----------
   localStorage is small (~5MB), so resize to max 1400px wide and
   re-encode as JPEG. Returns a data URL via callback. */
function readImageScaled(file, cb) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var max = 1400, w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { cb(c.toDataURL('image/jpeg', 0.82)); }
      catch (err) { cb(e.target.result); }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Star rating (input + display) ---------- */
function Stars(props) {
  var val = props.value || 0;
  return React.createElement('div', { className: 'stars-row' + (props.input ? ' input' : '') },
    [1, 2, 3, 4, 5].map(function (n) {
      return React.createElement('button', {
        key: n, type: 'button', className: 'star' + (n <= val ? ' on' : ''),
        onClick: props.input ? function () { props.onChange(n); } : null,
        tabIndex: props.input ? 0 : -1, 'aria-label': n + ' star'
      }, '\u2605');
    }));
}

/* ---------- Image lightbox (click to expand photos) ---------- */
function Lightbox(props) {
  var _i = React.useState(props.index || 0), idx = _i[0], setIdx = _i[1];
  var imgs = props.images || [];
  React.useEffect(function () {
    function key(e) {
      if (e.key === 'Escape') props.onClose();
      if (e.key === 'ArrowRight') setIdx(function (i) { return (i + 1) % imgs.length; });
      if (e.key === 'ArrowLeft') setIdx(function (i) { return (i - 1 + imgs.length) % imgs.length; });
    }
    document.addEventListener('keydown', key);
    return function () { document.removeEventListener('keydown', key); };
  }, [imgs.length]);
  return React.createElement('div', { className: 'imglb', onClick: props.onClose },
    React.createElement('button', { className: 'imglb-x', onClick: props.onClose, 'aria-label': 'Close' }, React.createElement(Icon, { name: 'x', size: 22 })),
    imgs.length > 1 && React.createElement('button', { className: 'imglb-nav prev', onClick: function (e) { e.stopPropagation(); setIdx((idx - 1 + imgs.length) % imgs.length); }, 'aria-label': 'Previous' }, React.createElement(Icon, { name: 'chevL', size: 26 })),
    React.createElement('img', { className: 'imglb-img', src: imgs[idx], alt: '', onClick: function (e) { e.stopPropagation(); } }),
    imgs.length > 1 && React.createElement('button', { className: 'imglb-nav next', onClick: function (e) { e.stopPropagation(); setIdx((idx + 1) % imgs.length); }, 'aria-label': 'Next' }, React.createElement(Icon, { name: 'chevR', size: 26 })),
    imgs.length > 1 && React.createElement('div', { className: 'imglb-count' }, (idx + 1) + ' / ' + imgs.length)
  );
}

/* ---------- Photo placeholder ---------- */
function PhotoPH(props) {
  return React.createElement('div', { className: 'ph' },
    React.createElement(Icon, { name: props.van ? 'van' : 'truck', size: props.size || 60, sw: 1.3 }));
}

/* ---------- Avatar ---------- */
function Avatar(props) {
  var initials = (props.name || '?').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  return React.createElement('div', { className: 'avatar' + (props.admin ? ' adm' : '') }, initials);
}

/* ---------- Calendar (month grid, booking-aware) ----------
   props: listingId, value {start,end,period}, onPick(dateStr), month state managed internally
   mode: 'range' — used by customer booking widget. */
function BookingCalendar(props) {
  var today = Store.todayYmd();
  var startD = Store.parseYmd(props.viewMonth);
  var _m = React.useState(props.viewMonth || today.slice(0, 7) + '-01'), monthAnchor = _m[0], setMonthAnchor = _m[1];
  var anchor = Store.parseYmd(monthAnchor);
  var year = anchor.getFullYear(), month = anchor.getMonth();
  var first = new Date(year, month, 1);
  var startDow = (first.getDay() + 6) % 7; // Mon=0
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var monthLabel = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  function shift(n) {
    var d = new Date(year, month + n, 1);
    setMonthAnchor(Store.ymd(d));
  }
  var minMonth = today.slice(0, 7) + '-01';
  var canPrev = monthAnchor > minMonth;

  var cells = [];
  for (var i = 0; i < startDow; i++) cells.push(null);
  for (var dd = 1; dd <= daysInMonth; dd++) cells.push(Store.ymd(new Date(year, month, dd)));

  var sel = props.value || {};
  var dragRef = React.useRef(null);
  var movedRef = React.useRef(false);
  React.useEffect(function () {
    function up() { dragRef.current = null; }
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
    return function () { document.removeEventListener('mouseup', up); document.removeEventListener('touchend', up); };
  }, []);
  function order(a, b) { return a <= b ? [a, b] : [b, a]; }
  function beginDrag(ds, disabled) { if (props.readOnly || disabled) return; dragRef.current = ds; movedRef.current = false; }
  function enterDrag(ds, disabled) {
    if (props.readOnly || disabled || !dragRef.current || !props.onRange) return;
    if (ds === dragRef.current) return;
    var r = order(dragRef.current, ds);
    movedRef.current = true;
    props.onRange(r[0], r[1]);
  }
  function cellClick(ds, status, disabled) {
    if (disabled || props.readOnly) return;
    if (movedRef.current) { movedRef.current = false; return; } // was a drag, not a click
    props.onPick(ds, status);
  }

  return React.createElement('div', { className: 'cal' },
    React.createElement('div', { className: 'cal-head' },
      React.createElement('b', null, monthLabel),
      React.createElement('div', { className: 'cal-nav' },
        React.createElement('button', { onClick: function () { shift(-1); }, disabled: !canPrev, 'aria-label': 'Previous month' }, React.createElement(Icon, { name: 'chevL', size: 16 })),
        React.createElement('button', { onClick: function () { shift(1); }, 'aria-label': 'Next month' }, React.createElement(Icon, { name: 'chevR', size: 16 })))),
    React.createElement('div', { className: 'cal-dow' },
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return React.createElement('span', { key: d }, d); })),
    React.createElement('div', { className: 'cal-grid' },
      cells.map(function (ds, idx) {
        if (!ds) return React.createElement('div', { key: 'e' + idx, className: 'cal-cell empty' });
        var past = ds < today;
        var status = past ? 'past' : Store.dayStatus(props.listingId, ds, props.ignoreBookingId);
        var l = Store.getListing(props.listingId);
        var blocked = l && l.blocked && l.blocked.indexOf(ds) !== -1;
        var cls = 'cal-cell ';
        var disabled = past || status === 'booked' || blocked;
        if (past) cls += 'past';
        else if (blocked) cls += 'blocked';
        else if (status === 'booked') cls += 'booked';
        else if (status === 'free') cls += 'free';
        else cls += 'half';
        // selection highlight
        var isSel = ds === sel.start || ds === sel.end;
        var inRange = sel.start && sel.end && ds > sel.start && ds < sel.end;
        if (isSel) cls += ' sel';
        else if (inRange) cls += ' inrange';
        var slotLabel = (!disabled && status !== 'free') ? (status === 'am' ? 'AM only' : 'PM only') : null;
        return React.createElement('div', {
          key: ds, className: cls,
          onMouseDown: (disabled || props.readOnly) ? null : function () { beginDrag(ds, disabled); },
          onMouseEnter: (disabled || props.readOnly) ? null : function () { enterDrag(ds, disabled); },
          onClick: (disabled || props.readOnly) ? null : function () { cellClick(ds, status, disabled); },
          style: props.readOnly ? { cursor: 'default' } : null,
          title: blocked ? 'Unavailable (maintenance)' : (status === 'booked' ? 'Fully booked' : '')
        }, Store.parseYmd(ds).getDate(),
          slotLabel && React.createElement('span', { className: 'slot' }, slotLabel));
      })),
    React.createElement('div', { className: 'cal-legend' },
      React.createElement('span', null, React.createElement('i', { className: 'free' }), 'Free'),
      React.createElement('span', null, React.createElement('i', { className: 'se' }), 'Selected'),
      React.createElement('span', null, React.createElement('i', { className: 'bk' }), 'Booked'),
      React.createElement('span', null, React.createElement('i', { className: 'bl' }), 'Unavailable'))
  );
}

Object.assign(window, {
  Icon: Icon, Field: Field, Badge: Badge, Modal: Modal,
  ToastProvider: ToastProvider, useToast: useToast,
  PhotoPH: PhotoPH, Avatar: Avatar, BookingCalendar: BookingCalendar,
  readImageScaled: readImageScaled, Stars: Stars, Lightbox: Lightbox
});
