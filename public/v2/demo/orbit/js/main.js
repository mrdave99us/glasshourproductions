(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // menu
  var hdr = $('header.site'), mb = $('.menu-btn'), nav = $('#nav');
  var solid = function () { hdr.classList.toggle('solid', window.scrollY > 40); }; window.addEventListener('scroll', solid, { passive: true }); solid();
  if (mb) mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); mb.textContent = o ? 'Close' : 'Menu'; });
  // star field
  var c = $('#stars');
  if (c && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var x = c.getContext('2d'), S = [], W, H, dpr = Math.min(2, window.devicePixelRatio || 1);
    var size = function () { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; S = []; for (var i = 0; i < 220; i++) S.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 * dpr + .2, p: Math.random() * 6.28, s: .4 + Math.random() * 1.2, d: .2 + Math.random() }); };
    size(); window.addEventListener('resize', size);
    (function draw(t) {
      x.clearRect(0, 0, W, H);
      for (var i = 0; i < S.length; i++) { var s = S[i]; var y = (s.y - window.scrollY * s.d * .12 * dpr) % H; if (y < 0) y += H; x.globalAlpha = .35 + .65 * Math.abs(Math.sin(s.p + t / 1000 * s.s)); x.fillStyle = i % 9 ? '#e9f0ff' : '#ff6b4a'; x.beginPath(); x.arc(s.x, y, s.r, 0, 6.28); x.fill(); }
      requestAnimationFrame(draw);
    })(0);
  }
  // the three orbits
  var tabs = $$('.tabs button'), panes = $$('.pane');
  var pick = function (i) { tabs.forEach(function (b, n) { b.setAttribute('aria-selected', n === i); }); panes.forEach(function (p, n) { p.hidden = n !== i; }); };
  tabs.forEach(function (b, i) { b.addEventListener('click', function () { pick(i); }); });
  $$('.ring button').forEach(function (b) { b.addEventListener('click', function () { var o = $('#orbits'); if (!o) { location.href = 'the-show.html'; return; } pick(+b.dataset.i); o.scrollIntoView({ behavior: 'smooth' }); }); });
  // tour: demo dates roll forward from today, so the list never goes stale. Replace SHOWS with your own dates.
  var SHOWS = window.ORBIT_SHOWS || [], list = $('#dates'), fmtM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], fmtD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var when = function (s) { var d = s.date ? new Date(s.date + 'T00:00') : new Date(); if (!s.date) d.setDate(d.getDate() + s.offset); return d; };
  if (list) {
    var cap = +list.dataset.cap || SHOWS.length;
    list.innerHTML = SHOWS.slice(0, cap).map(function (s) { var d = when(s); return '<li><div class="d"><small>' + fmtD[d.getDay()] + ' · ' + d.getFullYear() + '</small>' + fmtM[d.getMonth()] + ' ' + d.getDate() + '</div><div class="v">' + s.venue + '</div><div class="c">' + s.city + ' · ' + s.time + '</div><a class="btn sm ghost" href="' + s.url + '">Tickets</a></li>'; }).join('');
  }
  var nx = $('#next-what');
  if (nx && SHOWS.length) { var d0 = when(SHOWS[0]); nx.textContent = fmtD[d0.getDay()] + ', ' + fmtM[d0.getMonth()] + ' ' + d0.getDate() + ' · ' + SHOWS[0].venue + ', ' + SHOWS[0].city; }
  // video
  var pl = $('#player');
  var play = function (id) { pl.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>'; };
  if (pl) { pl.addEventListener('click', function () { play(pl.dataset.id); }, { once: true }); $$('.clips button').forEach(function (b) { b.addEventListener('click', function () { play(b.dataset.id); pl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); }); }
  // gallery
  $$('.grid button').forEach(function (b) { b.addEventListener('click', function () { var lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = '<img src="' + $('img', b).src + '" alt=""><button class="btn sm ghost">Close</button>'; lb.addEventListener('click', function () { lb.remove(); }); document.body.appendChild(lb); }); });
  // forms: no backend ships with the template. Point the form at your own handler.
  $$('form').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); $('.note', f).hidden = false; f.reset(); }); });
  // reveals
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(function (el) { io.observe(el); });
})();
