/* ===== Sussex Trailer Hire — site behaviour ===== */
(function () {
  'use strict';

  /* ---------- Gallery data ---------- */
  // Curated order: strongest shots first, then the rest.
  var featured = ['p02','p41','p38','p21','p59','p18','p13','p11','p56','p19','p48','p25','p33','p40','p10','p03','p05','p22','p39','p52'];
  var ids = featured.slice();
  for (var i = 1; i <= 61; i++) {
    var id = 'p' + String(i).padStart(2, '0');
    if (ids.indexOf(id) === -1) ids.push(id);
  }
  var seedOrder = ids.map(function (id) { return 'assets/gallery/' + id + '.webp'; });
  // Merge in admin-managed + approved community photos from the shared store.
  var photos = seedOrder.slice();
  if (window.Store) {
    var stored = Store.gallery();
    var extras = stored.filter(function (s) { return seedOrder.indexOf(s) === -1; });
    photos = extras.concat(seedOrder.filter(function (s) { return stored.indexOf(s) !== -1; }));
  }

  var masonry = document.getElementById('masonry');
  var INITIAL = 16;                       // photos shown before "show all"
  // deterministic size pattern -> editorial mosaic, no layout jumps
  function sizeClass(i) {
    if (i % 11 === 0) return ' t-big';
    if (i % 7 === 3)  return ' t-tall';
    if (i % 9 === 5)  return ' t-wide';
    return '';
  }
  var frag = document.createDocumentFragment();
  photos.forEach(function (src, idx) {
    var div = document.createElement('div');
    div.className = 'gitem' + sizeClass(idx) + (idx >= INITIAL ? ' is-hidden' : '');
    div.dataset.index = idx;
    div.innerHTML =
      '<img loading="lazy" src="' + src + '" alt="Sussex Van & Trailer Hire \u2014 vehicle transport and trailer hire">' +
      '<span class="zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span>';
    frag.appendChild(div);
  });
  masonry.appendChild(frag);

  /* ---------- Show all / show fewer ---------- */
  var galMore = document.getElementById('galMore');
  if (galMore) {
    var expanded = false;
    galMore.addEventListener('click', function () {
      expanded = !expanded;
      var items = masonry.querySelectorAll('.gitem');
      for (var k = INITIAL; k < items.length; k++) items[k].classList.toggle('is-hidden', !expanded);
      galMore.innerHTML = expanded
        ? 'Show fewer <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>'
        : 'Show all photos <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';
    });
  }

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCount = document.getElementById('lbCount');
  var current = 0;

  function show(n) {
    current = (n + photos.length) % photos.length;
    lbImg.src = photos[current];
    lbCount.textContent = (current + 1) + ' / ' + photos.length;
  }
  function open(n) { show(n); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function close() { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  masonry.addEventListener('click', function (e) {
    var item = e.target.closest('.gitem');
    if (item) open(parseInt(item.dataset.index, 10));
  });
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbNext').addEventListener('click', function () { show(current + 1); });
  document.getElementById('lbPrev').addEventListener('click', function () { show(current - 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  menuBtn.addEventListener('click', function () { navLinks.classList.toggle('open'); });
  navLinks.addEventListener('click', function (e) { if (e.target.tagName === 'A') navLinks.classList.remove('open'); });

  /* ---------- Quote form -> WhatsApp ---------- */
  var form = document.getElementById('quoteForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var lines = [
      'New enquiry — Sussex Van & Trailer Hire',
      '',
      'Name: ' + (g('qname') || '—'),
      'Phone: ' + (g('qphone') || '—'),
      'Service: ' + g('qservice'),
      'Trailer / item: ' + (g('qwhat') || '—'),
      'Dates: ' + (g('qdates') || '—'),
      'Message: ' + (g('qmsg') || '—')
    ];
    var url = 'https://wa.me/447378152002?text=' + encodeURIComponent(lines.join('\n'));
    window.open(url, '_blank', 'noopener');
  });

  /* ---------- Hero background carousel ---------- */
  var heroSlides = document.querySelectorAll('.hero-slide');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroSlides.length > 1 && !reduce) {
    var hi = 0;
    setInterval(function () {
      heroSlides[hi].classList.remove('is-active');
      hi = (hi + 1) % heroSlides.length;
      heroSlides[hi].classList.add('is-active');
    }, 5200);
  }

  /* ---------- Approved community reviews (from booking portal) ---------- */
  function renderReviews() {
    if (!(window.Store && Store.approvedReviews)) return;
    var revGrid = document.querySelector('.reviews');
    var approved = Store.approvedReviews();
    if (revGrid && approved.length) {
      approved.slice(0, 6).forEach(function (s) {
        var stars = '★★★★★'.slice(0, s.rating) + '☆☆☆☆☆'.slice(0, 5 - s.rating);
        var fig = document.createElement('figure');
        fig.className = 'review';
        var safe = (s.text || '').replace(/</g, '&lt;');
        fig.innerHTML =
          '<div class="stars">' + stars + '</div>' +
          '<p>“' + safe + '”</p>' +
          '<cite>' + (s.anonymous ? 'Anonymous' : (s.userName || 'Customer')) + '<span>' + (s.listingName || 'Verified hire') + '</span></cite>';
        revGrid.insertBefore(fig, revGrid.firstChild);
      });
    }
  }

  /* ---------- Live fleet cards (synced with booking admin) ---------- */
  function renderFleet() {
    if (!window.Store) return;
    var vanGlyph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 16V5a1 1 0 0 1 1-1h12v12"/><path d="M14 8h4l3 4v4h-3"/><circle cx="6.5" cy="17.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/><path d="M8.7 17.5h6.6M1 16h2.3"/></svg>';
    var truckGlyph = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="4" width="14" height="11"/><path d="M15 8h4l3 3v4h-3"/><circle cx="5.5" cy="17.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/></svg>';
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function card(l) {
      var img = (l.photos && l.photos[0])
        ? '<img src="' + l.photos[0] + '" alt="' + esc(l.name) + '" loading="lazy">'
        : '<div class="tcard-ph">' + (l.category === 'van' ? vanGlyph : truckGlyph) + '</div>';
      var specs = l.specs ? Object.keys(l.specs).slice(0, 3).map(function (k) { return '<span>' + esc(l.specs[k]) + '</span>'; }).join('') : '';
      var unavail = l.available ? '' : '<div class="tcard-unavail">Currently unavailable</div>';
      return '<a class="tcard" href="app.html">' +
        '<div class="tcard-img">' + img +
          '<div class="tcard-price">\u00a3' + l.fullDay + '<small>/day</small></div>' + unavail + '</div>' +
        '<div class="tcard-body">' +
          '<h3>' + esc(l.name) + '</h3>' +
          '<p>' + esc(l.blurb || '') + '</p>' +
          (specs ? '<div class="tcard-spec">' + specs + '</div>' : '') +
          '<div class="tcard-rates">Full day <b>\u00a3' + l.fullDay + '</b> \u00b7 Half day <b>\u00a3' + l.halfDay + '</b></div>' +
        '</div></a>';
    }
    var listings = Store.listings();
    var tEl = document.getElementById('trailerFleet');
    var vEl = document.getElementById('vanFleet');
    if (tEl) tEl.innerHTML = listings.filter(function (l) { return l.category === 'trailer'; }).map(card).join('');
    if (vEl) {
      var vans = listings.filter(function (l) { return l.category === 'van'; });
      vEl.innerHTML = vans.length ? vans.map(card).join('') : '<p class="lead">Vans coming online shortly — call us for details.</p>';
    }
  }

  /* ---------- Boot store-dependent sections once data has loaded ---------- */
  function renderStoreBits() { renderReviews(); renderFleet(); }
  if (window.Store && Store.init) { Store.init().then(renderStoreBits).catch(function (e) { console.error(e); renderStoreBits(); }); }
  else if (window.Store) { renderStoreBits(); }

  /* ---------- Year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
