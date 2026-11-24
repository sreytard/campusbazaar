'use strict';
/* CampusBazaar front end: vanilla JS single-page app with hash routing. */
const $app = document.getElementById('app'), $nav = document.getElementById('nav'), $toast = document.getElementById('toast');
let user = null, cleanup = null, unread = 0, exam = false;
try { exam = localStorage.getItem('exam') === '1'; } catch { }
function applyExam() {
  document.documentElement.dataset.exam = exam ? '1' : '0';
  const old = document.getElementById('prof'); if (old) old.remove();
  if (!exam) return;
  document.body.append(h('button', { id: 'prof', class: 'btn', onclick: showProf }, 'Prof aaya!'));
}
function toggleExam() {
  exam = !exam; try { localStorage.setItem('exam', exam ? '1' : '0'); } catch { }
  applyExam(); renderNav($nav.className === ''); toast(exam ? 'Exam night on. Notes, lamps and snacks first.' : 'Back to normal');
  if (location.hash.startsWith('#/market')) router();
}
function showProf() {
  const close = () => { o.remove(); removeEventListener('keydown', k); }, k = e => e.key === 'Escape' && close();
  const o = h('div', { class: 'prof-ov', onclick: close }, h('div', { class: 'doc' }, h('h2', null, 'Unit 3: Database Normalization'), h('p', null, 'A relation is in first normal form if every attribute holds only atomic values. Second normal form removes partial dependencies on a composite key. Third normal form removes transitive dependencies between non-key attributes.'), h('p', null, 'Example: Student(RollNo, Name, Dept, HOD). HOD depends on Dept, not on RollNo, so the table should be split into Student and Department.'), h('p', { style: 'color:#888;font-size:13px' }, 'Press Esc or click anywhere to go back.')));
  document.body.append(o); addEventListener('keydown', k);
}
const EMOJI = { books: '📘', gear: '🚲', services: '🎨', fashion: '👕', other: '📦' };
const TINT = { books: '#2a8c92', gear: '#e0627a', services: '#f2b544', fashion: '#6a5acd', other: '#5b6078' };
const CATS = [['all', 'All'], ['books', 'Books'], ['gear', 'Gear'], ['services', 'Services'], ['fashion', 'Fashion'], ['other', 'Other']];


/* ---------- illustrations (inline SVG, no image files needed) ---------- */
function art(cat) {
  const c = TINT[cat] || TINT.other, bk = ['#e0627a', '#f2b544', '#2a8c92', '#6a5acd', '#f6f7fb', '#e0627a', '#2a8c92'];
  const S = {
    books: '<circle cx="320" cy="70" r="46" fill="#f2b544" opacity=".9"/><rect x="40" y="215" width="320" height="10" rx="5" fill="#fff" opacity=".3"/>' + bk.map((k, i) => `<rect x="${58 + i * 40}" y="${105 + (i % 3) * 12}" width="30" height="${110 - (i % 3) * 12}" rx="4" fill="${k}" transform="rotate(${i === 6 ? 12 : 0} ${58 + i * 40} 215)"/><rect x="${64 + i * 40}" y="${125 + (i % 3) * 12}" width="18" height="4" rx="2" fill="#10142a" opacity=".35"/>`).join(''),
    gear: '<circle cx="320" cy="70" r="40" fill="#f2b544" opacity=".9"/><circle cx="125" cy="205" r="52" fill="none" stroke="#fff" stroke-width="8"/><circle cx="285" cy="205" r="52" fill="none" stroke="#fff" stroke-width="8"/><path d="M125 205 L190 120 L285 205 M190 120 L235 120 M125 205 L215 205 L190 120" fill="none" stroke="#10142a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="215" cy="205" r="9" fill="#f2b544"/>',
    services: '<circle cx="320" cy="70" r="40" fill="#fff" opacity=".7"/><rect x="95" y="60" width="210" height="140" rx="10" fill="#fff" opacity=".92"/><circle cx="150" cy="115" r="22" fill="#e0627a"/><rect x="190" y="95" width="90" height="12" rx="6" fill="#10142a" opacity=".6"/><rect x="190" y="120" width="60" height="12" rx="6" fill="#2a8c92"/><rect x="120" y="160" width="160" height="10" rx="5" fill="#f2b544"/><path d="M150 200 L130 255 M250 200 L270 255 M200 200 L200 255" stroke="#10142a" stroke-width="7" stroke-linecap="round"/>',
    fashion: '<circle cx="320" cy="70" r="40" fill="#f2b544" opacity=".8"/><path d="M200 60 a14 14 0 1 1 14 14 L200 90 L90 160 H310 L200 90" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/><path d="M130 170 L100 220 L150 235 L155 205 V260 H245 V205 L250 235 L300 220 L270 170 Q200 195 130 170Z" fill="#e0627a"/>',
    other: '<circle cx="320" cy="70" r="40" fill="#f2b544" opacity=".8"/><path d="M100 120 L200 85 L300 120 V230 L200 262 L100 230Z" fill="#f6f7fb" opacity=".95"/><path d="M200 85 V262 M100 120 L200 155 L300 120" fill="none" stroke="#10142a" stroke-opacity=".35" stroke-width="5"/><rect x="170" y="150" width="60" height="14" rx="4" fill="#e0627a"/>'
  };
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${cat}"><defs><linearGradient id="g${cat}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#10142a"/></linearGradient></defs><rect width="400" height="300" fill="url(#g${cat})"/><circle cx="60" cy="40" r="90" fill="#fff" opacity=".06"/>${S[cat] || S.other}</svg>`;
}

/* ---------- helpers ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => c != null && c !== false && e.append(c.nodeType ? c : document.createTextNode(c)));
  return e;
}
async function api(path, method = 'GET', body) {
  const r = await fetch('/api/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}
let tt; function toast(m) { $toast.textContent = m; $toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => $toast.classList.remove('on'), 2600); }
const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
function ago(t) { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : s < 86400 ? Math.floor(s / 3600) + ' hr ago' : Math.floor(s / 86400) + ' days ago'; }
const go = p => { location.hash = p; };
function photo(l, cls = '') {
  const d = h('div', { class: 'ph ' + cls });
  if (l.image) d.style.backgroundImage = `url("${l.image}")`; else d.innerHTML = art(l.cat);
  return d;
}
function card(l) {
  return h('a', { class: 'card', href: '#/item/' + l.id }, l.status === 'sold' ? h('span', { class: 'tag' }, 'Sold') : null,
    h('div', { class: 'ph-w' }, photo(l)),
    h('div', { class: 't' }, h('h3', null, l.title), h('div', { class: 'm' }, h('span', null, l.sellerHostel + ' · ' + ago(l.created)), h('b', null, rupee(l.price)))));
}
function listGrid(list) { return list.length ? h('div', { class: 'grid' }, list.map(card)) : h('div', { class: 'empty' }, 'Nothing here yet. Be the first to list something.'); }

/* ---------- nav ---------- */
function renderNav(home) {
  $nav.className = home ? '' : 'solid';
  const links = [h('a', { class: 'logo', href: '#/' }, 'CampusBazaar'), h('a', { class: 'l hide', href: '#/', onclick: e => { e.preventDefault(); toggleExam(); } }, exam ? '☀️ Normal' : '🌙 Exam night'), h('a', { class: 'l', href: '#/market' }, 'Browse')];
  if (user) links.push(h('a', { class: 'l hide', href: '#/wishlist' }, 'Saved'), h('a', { class: 'l', href: '#/inbox' }, 'Messages', unread ? h('span', { class: 'badge' }, unread) : null), h('a', { class: 'l hide', href: '#/mine' }, 'My listings'),
    user.role === 'admin' ? h('a', { class: 'l hide', href: '#/admin' }, 'Admin') : null, h('a', { class: 'pill', href: '#/sell' }, 'Sell'),
    h('a', { class: 'l hide', href: '#/account' }, 'Account'), h('a', { class: 'l hide', href: '#/', onclick: async e => { e.preventDefault(); await api('logout', 'POST'); user = null; unread = 0; toast('Signed out'); go('/'); router(); } }, 'Sign out'));
  else links.push(h('a', { class: 'l', href: '#/login' }, 'Sign in'), h('a', { class: 'pill', href: '#/register' }, 'Join'));
  links.push(h('button', { class: 'menu-btn', 'aria-label': 'Menu', onclick: () => $nav.classList.toggle('open') }, '☰'));
  $nav.replaceChildren(...links.filter(Boolean));
}
async function refreshUnread() {
  if (!user) return unread = 0;
  try { const { threads } = await api('messages'); unread = threads.filter(t => t.unread).length; } catch { }
}

/* ---------- home ---------- */
const HOME = () => `
<header class="hero" id="hero"><div class="layer sky" data-speed=".25"></div>
<svg viewBox="0 0 1440 400" preserveAspectRatio="none" aria-hidden="true"><path d="M0 220 C240 120 420 260 700 190 C980 120 1200 240 1440 160 L1440 400 L0 400Z" fill="#232a55"/><path d="M0 300 C300 230 560 340 860 270 C1100 215 1300 300 1440 260 L1440 400 L0 400Z" fill="#10142a"/></svg>
<div class="hero-copy" id="heroCopy"><h1>Everything your campus is selling.</h1><p>Buy, sell and swap books, gear and services with students who actually live down the hall.</p><a class="btn" href="#/market">Browse listings</a></div>
<div class="pop p1"><i>₹</i><span>Riya sold her DBMS notes<small>2 minutes ago, Hostel B</small></span></div>
<div class="pop p2"><i>★</i><span>Cycle, barely used, ₹2,800<small>Aman, Block C</small></span></div>
<div class="pop p3"><i>✎</i><span>Poster design, same day<small>Kabir, Hostel A</small></span></div></header>
<div class="live" id="live"><span class="dot"></span><span id="liveTxt">Tuning in to your campus…</span><div class="tick"><div id="tickIn"></div></div></div>
<section class="story" id="story"><div class="stage">
<div class="scene s0"><div class="bg"></div><div class="art">${art('books')}</div></div><div class="scene s1"><div class="bg"></div><div class="art">${art('gear')}</div></div><div class="scene s2"><div class="bg"></div><div class="art">${art('services')}</div></div>
<div class="slabel" id="slabel">Books</div>
<div class="copy"><h2>Last year's books, this year's savings.</h2><p>Find the exact edition your professor asked for, from a senior in your own department.</p><a href="#/market/books">Browse books and notes</a></div>
<div class="copy"><h2>Gear that deserves a second semester.</h2><p>Cycles, coolers, laptops and lamps. Meet on campus, check it in person, pay on the spot.</p><a href="#/market/gear">Browse hostel gear</a></div>
<div class="copy"><h2>Student businesses, all in one place.</h2><p>Designers, tutors, bakers and photographers on your campus, reviewed by people you know.</p><a href="#/market/services">Browse services</a></div>
<div class="bar"><span id="bar"></span></div></div></section>
<section class="sec calc"><div class="wrap"><h2>Hostel budget math</h2><p class="sub">Slide to what you usually spend each month. Used books, gear and student services cost far less, so here is roughly what you keep.</p>
<div class="calc-grid"><div class="sliders">
<label for="rb">Books and notes <b id="vb"></b></label><input type="range" id="rb" min="0" max="5000" step="100" value="1500">
<label for="rg">Hostel gear <b id="vg"></b></label><input type="range" id="rg" min="0" max="5000" step="100" value="1000">
<label for="rs">Services, food and tutoring <b id="vs"></b></label><input type="range" id="rs" min="0" max="3000" step="100" value="800"></div>
<div class="result"><small>You could keep about</small><b id="cSave">₹0</b><small>every year. Estimate based on typical used-item prices.</small><a class="btn" href="#/market" style="margin-top:20px">Start saving</a></div></div></div></section>
<section class="sec aisles"><div class="wrap"><div class="head"><h2>Pick your aisle</h2></div></div><div class="strip" id="strip"></div></section>
<section class="sec"><div class="wrap"><div class="head"><h2>Fresh on campus today</h2><a class="btn ghost sm" href="#/market">See all listings</a></div><div id="fresh"></div></div></section>
<footer class="cta"><h2>Your campus already has what you need.</h2><p>Sign in with your college email and list your first item in under a minute.</p><a class="btn" href="#/sell">List something</a></footer>`;


function initExtras() {
  const strip = $app.querySelector('#strip');
  [['books', 'Books and notes', 'Last year\'s syllabus, half the price'], ['gear', 'Hostel gear', 'Cycles, coolers, lamps'], ['services', 'Services', 'Designers, tutors, bakers'], ['fashion', 'Fashion', 'Fest outfits and thrift finds'], ['other', 'Everything else', 'Odds and ends from your block']].forEach(([k, n, d]) =>
    strip.append(h('a', { class: 'tile', href: '#/market/' + k }, h('div', { class: 'tile-art', html: 1 }), h('h3', null, n), h('p', null, d))));
  strip.querySelectorAll('.tile-art').forEach((el, i) => el.innerHTML = art(['books', 'gear', 'services', 'fashion', 'other'][i]));
  const fm = n => '₹' + n.toLocaleString('en-IN'), rate = { rb: .5, rg: .4, rs: .3 }, lab = { rb: 'vb', rg: 'vg', rs: 'vs' };
  function calc() { let t = 0; for (const k in rate) { const v = +$app.querySelector('#' + k).value; $app.querySelector('#' + lab[k]).textContent = fm(v) + '/month'; t += v * rate[k] * 12; } $app.querySelector('#cSave').textContent = fm(Math.round(t / 100) * 100); }
  $app.querySelectorAll('.sliders input').forEach(i => i.addEventListener('input', calc)); calc();
  api('activity').then(d => {
    $app.querySelector('#liveTxt').textContent = `${d.online} online now · ${d.active} listings live · ${d.students} students`;
    const items = d.recent.map(r => `${r.sellerName.split(' ')[0]} listed ${r.title} · ${ago(r.created)}`);
    $app.querySelector('#tickIn').textContent = items.concat(items).join('      ●      ');
  }).catch(() => { });
}

async function viewHome() {
  renderNav(true); $app.innerHTML = HOME(); initExtras();
  api('listings?sort=new').then(d => document.getElementById('fresh').replaceChildren(listGrid(d.listings.slice(0, 6))));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = $app.querySelector('#hero'), hc = $app.querySelector('#heroCopy'), layers = hero.querySelectorAll('.layer');
  const story = $app.querySelector('#story'), scenes = story.querySelectorAll('.scene'), copies = story.querySelectorAll('.copy'), bar = $app.querySelector('#bar'), label = $app.querySelector('#slabel');
  const names = ['Books', 'Gear', 'Services'], cl = v => Math.max(0, Math.min(1, v)); let tick = false;
  function update() {
    tick = false; const y = scrollY, vh = innerHeight;
    $nav.className = y > vh * .7 ? 'solid' : '';
    if (y < vh * 1.2 && !reduce) { layers.forEach(l => l.style.transform = `translate3d(0,${y * l.dataset.speed}px,0)`); hc.style.transform = `translate3d(0,${y * -.15}px,0)`; hc.style.opacity = 1 - cl(y / (vh * .7)); }
    const r = story.getBoundingClientRect(), p = cl(-r.top / (r.height - vh)), pos = p * 3, act = Math.min(2, Math.floor(pos));
    bar.style.width = p * 100 + '%';
    scenes.forEach((s, i) => { const d = Math.abs(pos - (i + .5)); s.style.opacity = reduce ? (i === act ? 1 : 0) : cl(1.6 - d * 2.4); if (!reduce) s.firstElementChild.style.transform = `translate3d(0,${(pos - i - .5) * -60}px,0) scale(${1.08 - d * .04})`; });
    copies.forEach((c, i) => c.classList.toggle('on', i === act && r.top <= vh * .2 && r.bottom >= vh * .8));
    label.textContent = names[act];
  }
  const req = () => { if (!tick) { tick = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); update();
  cleanup = () => { removeEventListener('scroll', req); removeEventListener('resize', req); };
}

/* ---------- marketplace ---------- */
async function viewMarket(cat = 'all') {
  renderNav(false);
  const s = { q: '', cat, sort: 'new' }, out = h('div'), count = h('p', { style: 'color:var(--muted);margin-bottom:18px' });
  const chips = h('div', { class: 'chips' });
  async function load() {
    chips.replaceChildren(...CATS.map(([k, n]) => h('button', { class: 'chip', 'aria-pressed': s.cat === k, onclick: () => { s.cat = k; load(); } }, n)));
    const d = await api(`listings?q=${encodeURIComponent(s.q)}&cat=${s.cat}&sort=${s.sort}`);
    count.textContent = d.listings.length + (d.listings.length === 1 ? ' listing' : ' listings'); out.replaceChildren(listGrid(d.listings));
  }
  let dt; const q = h('input', { type: 'search', placeholder: 'Search books, cycles, tutors…', 'aria-label': 'Search', oninput: e => { clearTimeout(dt); dt = setTimeout(() => { s.q = e.target.value; load(); }, 250); } });
  const sort = h('select', { 'aria-label': 'Sort', onchange: e => { s.sort = e.target.value; load(); } }, h('option', { value: 'new' }, 'Newest first'), h('option', { value: 'low' }, 'Price: low to high'), h('option', { value: 'high' }, 'Price: high to low'));
  const picks = exam ? h('div', { class: 'chips', style: 'margin-bottom:18px;align-items:center' }, h('b', { style: 'margin-right:6px' }, 'Exam night picks'), ['notes', 'lamp', 'charger', 'brownies', 'tutoring'].map(k => h('button', { class: 'chip', onclick: () => { s.q = k; q.value = k; load(); } }, k))) : null;
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', null, 'Browse the bazaar'), h('div', { class: 'tools', style: 'margin-top:26px' }, q, sort), picks, h('div', { style: 'margin-bottom:22px' }, chips), count, out));
  await load();
}
async function viewList(title, path, empty) {
  renderNav(false); if (!user) return go('/login');
  const d = await api(path); $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', { style: 'margin-bottom:28px' }, title), d.listings.length ? listGrid(d.listings) : h('div', { class: 'empty' }, empty)));
}

/* ---------- item ---------- */
async function viewItem(id) {
  renderNav(false);
  const { listing: l } = await api('listings/' + id), mine = user && user.id === l.seller, box = h('div', { class: 'box' });
  const pay = l.pay || { upi: false, cod: true, upiId: '' };
  const payText = [pay.upi ? 'UPI' : null, pay.cod ? 'Cash on delivery' : null].filter(Boolean).join(' · ');
  const wish = h('button', { class: 'btn ghost', onclick: async () => { if (!user) return go('/login'); const r = await api('wish/' + id, 'POST'); wish.textContent = r.wished ? '♥ Saved' : '♡ Save'; toast(r.wished ? 'Saved to your list' : 'Removed from saved'); } }, l.wished ? '♥ Saved' : '♡ Save');
  if (mine || (user && user.role === 'admin')) {
    box.append(h('p', { style: 'margin-bottom:14px;color:var(--muted)' }, mine ? 'This is your listing.' : 'Admin controls'), h('div', { class: 'row' },
      mine ? h('button', { class: 'btn', onclick: async () => { await api(`listings/${id}/status`, 'POST'); toast('Updated'); viewItem(id); } }, l.status === 'sold' ? 'Mark as available' : 'Mark as sold') : null,
      h('a', { class: 'btn ghost', href: '#/edit/' + id }, 'Edit or change photo'),
      h('button', { class: 'btn danger', onclick: async () => { if (confirm('Delete this listing for good?')) { await api('listings/' + id, 'DELETE'); toast('Listing deleted'); go('/market'); } } }, 'Delete listing')));
  } else if (l.status === 'sold') box.append(h('p', null, 'This item has been sold.'));
  else if (!user) box.append(h('p', { style: 'margin-bottom:14px' }, 'Sign in to message ' + l.sellerName + '.'), h('a', { class: 'btn', href: '#/login' }, 'Sign in'));
  else { const t = h('textarea', { placeholder: `Hi ${l.sellerName.split(' ')[0]}, is this still available?` }), e = h('div', { class: 'err' });
    box.append(h('label', { style: 'margin-top:0' }, 'Message the seller'), t, e, h('button', { class: 'btn', style: 'margin-top:12px', onclick: async () => { try { await api('messages', 'POST', { listing: l.id, to: l.seller, text: t.value }); go(`/chat/${l.id}/${l.seller}`); } catch (x) { e.textContent = x.message; } } }, 'Send message')); }
  /* payment options for buyers: UPI opens the phone's payment app, cash on delivery is paid in person */
  let payBox = null;
  if (user && !mine && user.role !== 'admin' && l.status !== 'sold') {
    const upiLink = 'upi://pay?pa=' + pay.upiId + '&pn=' + encodeURIComponent(l.sellerName) + (l.price > 0 ? '&am=' + l.price : '') + '&cu=INR&tn=' + encodeURIComponent('CampusBazaar: ' + l.title.slice(0, 40));
    const copyUpi = async () => { try { await navigator.clipboard.writeText(pay.upiId); toast('UPI ID copied'); } catch { toast('Could not copy. Select the ID and copy it by hand.'); } };
    payBox = h('div', { class: 'box' }, h('b', null, 'How to pay'),
      h('p', { style: 'color:var(--muted);font-size:14px;margin:6px 0 14px' }, 'Money goes straight to the seller, not through CampusBazaar. Check the item in person before you pay.'),
      pay.upi && pay.upiId ? h('div', { style: 'margin-bottom:14px' },
        h('div', { class: 'row' }, h('a', { class: 'btn', href: upiLink }, 'Pay ' + rupee(l.price) + ' via UPI'), h('button', { class: 'btn ghost', onclick: copyUpi }, 'Copy UPI ID')),
        h('p', { style: 'margin-top:8px;color:var(--muted);font-size:14px' }, 'UPI ID: ' + pay.upiId + '. On a laptop, copy the ID and pay from your phone.')) : null,
      pay.cod ? h('p', null, '💵 Cash on delivery: pay in cash when you meet the seller.') : null);
  }
  const rateBox = l.canRate ? h('div', { class: 'box' }, h('b', null, l.myStars ? 'Your rating for ' + l.sellerName.split(' ')[0] : 'Rate ' + l.sellerName.split(' ')[0]), h('div', { class: 'row', style: 'margin-top:8px' }, [1, 2, 3, 4, 5].map(n => h('button', { class: 'star' + (n <= l.myStars ? ' on' : ''), 'aria-label': n + ' stars', onclick: async () => { try { await api('rate', 'POST', { seller: l.seller, stars: n }); toast('Thanks for rating'); viewItem(id); } catch (x) { toast(x.message); } } }, '★')))) : null;
  const reportBtn = user && !mine && user.role !== 'admin' ? h('button', { class: 'btn ghost', onclick: async () => { const r = prompt('What is wrong with this listing?'); if (!r) return; try { await api('report', 'POST', { listing: l.id, reason: r }); toast('Reported. An admin will review it.'); } catch (x) { toast(x.message); } } }, 'Report') : null;
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('a', { href: '#/market', style: 'color:var(--muted)' }, '← Back to browse'), h('div', { class: 'item', style: 'margin-top:20px' }, photo(l),
    h('div', null, h('div', { class: 'meta' }, h('span', null, l.cat), h('span', null, '·'), h('span', null, l.cond), h('span', null, '·'), h('span', null, ago(l.created))), h('h1', { style: 'font-size:clamp(30px,4vw,46px)' }, l.title), h('div', { class: 'price' }, rupee(l.price)),
      h('p', { style: 'white-space:pre-wrap' }, l.desc || 'No description added.'), h('p', { style: 'margin-top:18px;color:var(--muted)' }, `Sold by ${l.sellerName}, ${l.sellerHostel}` + (l.sellerRating ? ` · ★ ${l.sellerRating} (${l.sellerRatings})` : ' · No ratings yet')),
      h('p', { style: 'margin-top:6px;color:var(--muted)' }, 'Payment: ' + payText), h('div', { class: 'row', style: 'margin-top:18px' }, wish, reportBtn), rateBox, box, payBox))));
}

/* ---------- sell ---------- */
async function viewSell(editId) {
  renderNav(false); if (!user) return go('/login');
  const L = editId ? (await api('listings/' + editId)).listing : null; let rm = false;
  let img = null; const err = h('div', { class: 'err' }), f = {};
  const field = (name, label, el) => { f[name] = el; return [h('label', { for: name }, label), el]; };
  const prev = h('p', { style: 'color:var(--muted);font-size:14px;margin-top:6px' }, L ? (L.image ? 'Your current photo stays unless you choose a new one.' : 'No photo yet. Add one to replace the illustration.') : '');
  const rmBox = L && L.image ? h('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:400' }, h('input', { type: 'checkbox', style: 'width:auto', onchange: e => rm = e.target.checked }), 'Remove current photo') : null;
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', id: 'img', onchange: e => {
    const fl = e.target.files[0]; if (!fl) return; if (fl.size > 3.5e6) { err.textContent = 'Photo must be under 3.5 MB'; e.target.value = ''; return; }
    const r = new FileReader(); r.onload = () => { img = r.result; prev.textContent = 'Photo added: ' + fl.name; err.textContent = ''; }; r.readAsDataURL(fl); } });
  /* payment methods: UPI (needs a UPI ID) and/or cash on delivery */
  const P = L && L.pay ? L.pay : { upi: false, cod: true, upiId: '' };
  const upiOn = h('input', { type: 'checkbox', id: 'payupi', style: 'width:auto' }), codOn = h('input', { type: 'checkbox', id: 'paycod', style: 'width:auto' });
  const upiId = h('input', { id: 'upiid', maxlength: 60, placeholder: 'yourname@okhdfcbank', autocapitalize: 'none', autocomplete: 'off' });
  const upiBox = h('div', null, h('label', { for: 'upiid' }, 'Your UPI ID'), upiId);
  upiOn.checked = !!P.upi; codOn.checked = !!P.cod; upiId.value = P.upiId || '';
  const syncUpi = () => { upiBox.style.display = upiOn.checked ? '' : 'none'; }; upiOn.addEventListener('change', syncUpi); syncUpi();
  const btn = h('button', { class: 'btn', style: 'margin-top:22px', onclick: async () => {
    btn.disabled = true; try { const data = { title: f.title.value, cat: f.cat.value, price: f.price.value, cond: f.cond.value, desc: f.desc.value, image: img, removeImage: rm, pay: { upi: upiOn.checked, cod: codOn.checked, upiId: upiId.value } }; const r = editId ? await api('listings/' + editId, 'PUT', data) : await api('listings', 'POST', data); toast(editId ? 'Changes saved' : 'Your listing is live'); go('/item/' + r.listing.id); } catch (x) { err.textContent = x.message; btn.disabled = false; } } }, L ? 'Save changes' : 'Publish listing');
  const sel = (id, opts) => h('select', { id }, opts.map(o => h('option', { value: o[0] }, o[1])));
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', null, L ? 'Edit listing' : 'List something'), h('div', { class: 'form' },
    field('title', 'Title', h('input', { id: 'title', maxlength: 80, placeholder: 'e.g. Engineering Physics, 2nd year' })), field('cat', 'Category', sel('cat', CATS.slice(1))),
    field('price', 'Price in rupees', h('input', { id: 'price', type: 'number', min: 0, placeholder: '250' })), field('cond', 'Condition', sel('cond', ['New', 'Like new', 'Good', 'Fair'].map(x => [x, x]))),
    field('desc', 'Description', h('textarea', { id: 'desc', maxlength: 800, placeholder: 'Edition, age, what is included, where you can meet' })),
    h('label', null, 'How buyers can pay'),
    h('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:400;margin:8px 0' }, upiOn, 'UPI (online payment)'), upiBox,
    h('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:400;margin:8px 0' }, codOn, 'Cash on delivery (pay when you meet)'),
    h('label', { for: 'img' }, 'Photo (optional)'), file, prev, rmBox, err, btn)));
  if (L) { f.title.value = L.title; f.cat.value = L.cat; f.price.value = L.price; f.cond.value = L.cond; f.desc.value = L.desc; }
}

/* ---------- messages ---------- */
async function viewInbox() {
  renderNav(false); if (!user) return go('/login');
  const { threads } = await api('messages'); await refreshUnread(); renderNav(false);
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', { style: 'margin-bottom:28px' }, 'Messages'), threads.length ? threads.map(t => h('a', { class: 'thread', href: `#/chat/${t.listing}/${t.other}` }, h('div', null, h('b', null, t.otherName), h('small', null, t.title), h('small', null, t.last.slice(0, 80))), h('div', { style: 'text-align:right' }, h('small', null, ago(t.at)), t.unread ? h('span', { class: 'badge', style: 'display:inline-block;background:var(--rose);color:#fff;border-radius:9px;padding:0 7px;font-size:12px' }, 'new') : null))) : h('div', { class: 'empty' }, 'No conversations yet. Message a seller from any listing.')));
}
async function viewChat(lid, oid) {
  renderNav(false); if (!user) return go('/login');
  const box = h('div', { class: 'chat' }), t = h('input', { placeholder: 'Write a message', 'aria-label': 'Message', maxlength: 500 }), err = h('div', { class: 'err' }); let n = -1, title = h('h1', { style: 'font-size:32px' }, 'Chat');
  async function load() {
    const d = await api(`messages/${lid}/${oid}`); title.textContent = d.other ? d.other.name : 'Chat';
    if (d.messages.length === n) return; n = d.messages.length;
    box.replaceChildren(...d.messages.map(m => h('div', { class: 'msg' + (m.from === user.id ? ' me' : '') }, m.text))); box.scrollTop = box.scrollHeight;
  }
  async function send() { if (!t.value.trim()) return; try { await api('messages', 'POST', { listing: +lid, to: +oid, text: t.value }); t.value = ''; err.textContent = ''; await load(); } catch (x) { err.textContent = x.message; } }
  t.addEventListener('keydown', e => e.key === 'Enter' && send());
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('a', { href: '#/inbox', style: 'color:var(--muted)' }, '← All messages'), h('div', { style: 'margin-top:12px' }, title, h('a', { href: '#/item/' + lid, style: 'color:var(--muted)' }, 'View listing')), box, h('div', { class: 'row' }, h('div', { style: 'flex:1' }, t), h('button', { class: 'btn', onclick: send }, 'Send')), err));
  await load(); const iv = setInterval(() => load().catch(() => { }), 4000); cleanup = () => clearInterval(iv);
}

/* ---------- auth ---------- */
function viewAuth(reg) {
  renderNav(false); const err = h('div', { class: 'err' }), f = {};
  const inp = (k, label, attrs) => [h('label', { for: k }, label), f[k] = h('input', { id: k, ...attrs })];
  const submit = async () => { try { const r = await api(reg ? 'register' : 'login', 'POST', { name: f.name && f.name.value, hostel: f.hostel && f.hostel.value, email: f.email.value, password: f.password.value }); user = r.user; await refreshUnread(); toast('Welcome, ' + user.name.split(' ')[0]); go('/market'); } catch (x) { err.textContent = x.message; } };
  const form = h('div', { class: 'form' }, reg ? inp('name', 'Full name', { autocomplete: 'name' }) : null, ...inp('email', 'College email', { type: 'email', autocomplete: 'email' }), reg ? inp('hostel', 'Hostel or block', { placeholder: 'Hostel B' }) : null,
    ...inp('password', 'Password', { type: 'password', autocomplete: reg ? 'new-password' : 'current-password', placeholder: reg ? 'At least 6 characters' : '' }), err,
    h('button', { class: 'btn', style: 'margin-top:20px', onclick: submit }, reg ? 'Create account' : 'Sign in'),
    h('p', { style: 'margin-top:20px;color:var(--muted)' }, reg ? 'Already have an account? ' : 'New to CampusBazaar? ', h('a', { href: reg ? '#/login' : '#/register', style: 'text-decoration:underline' }, reg ? 'Sign in' : 'Create an account')));
  form.addEventListener('keydown', e => e.key === 'Enter' && submit());
  const side = h('aside', { class: 'auth-side' });
  side.innerHTML = `<div class="art">${art(reg ? 'services' : 'books')}</div><div class="auth-copy"><h2>${reg ? 'Your campus is already selling.' : 'Good to see you again.'}</h2><p>${reg ? 'Join with your college email and list your first item in under a minute.' : 'New listings, replies and saved items are waiting for you.'}</p></div>
  <div class="pop q1"><i>₹</i><span>Riya sold her DBMS notes<small>Hostel B</small></span></div><div class="pop q2"><i>★</i><span>Cycle, ₹2,800<small>Block C</small></span></div>`;
  $app.replaceChildren(h('div', { class: 'auth' }, side, h('div', { class: 'auth-main' }, h('h1', { style: 'margin-bottom:8px' }, reg ? 'Create your account' : 'Welcome back'), h('p', { style: 'color:var(--muted);margin-bottom:10px' }, reg ? 'Takes less than a minute.' : 'Sign in to buy, sell and message.'), form)));
}

/* ---------- account ---------- */
function viewAccount() {
  renderNav(false); if (!user) return go('/login');
  const err = h('div', { class: 'err' }), f = {};
  const inp = (k, label, attrs) => [h('label', { for: k }, label), f[k] = h('input', { id: k, ...attrs })];
  const save = h('button', { class: 'btn', style: 'margin-top:20px', onclick: async () => {
    try { const r = await api('account', 'POST', { name: f.name.value, hostel: f.hostel.value, oldPassword: f.old.value, newPassword: f.nw.value }); user = r.user; f.old.value = f.nw.value = ''; err.textContent = ''; renderNav(false); toast('Account updated'); } catch (x) { err.textContent = x.message; } } }, 'Save changes');
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', { style: 'margin-bottom:6px' }, 'Account'), h('p', { style: 'color:var(--muted)' }, user.email),
    h('div', { class: 'form' }, ...inp('name', 'Full name', { value: user.name }), ...inp('hostel', 'Hostel or block', { value: user.hostel }),
      h('h3', { style: 'margin-top:30px;font-size:20px' }, 'Change password'), ...inp('old', 'Current password', { type: 'password', autocomplete: 'current-password' }), ...inp('nw', 'New password', { type: 'password', autocomplete: 'new-password', placeholder: 'Leave blank to keep the same' }), err, save)));
}

/* ---------- admin ---------- */
async function viewAdmin() {
  renderNav(false); if (!user || user.role !== 'admin') return go('/');
  const d = await api('admin/stats'), stat = (n, l) => h('div', { class: 'stat' }, h('b', null, n), l);
  const rows = d.users.map(u => {
    const act = u.role === 'admin' ? '' : h('div', { class: 'row' },
      h('button', { class: 'btn sm ghost', onclick: async () => { if (!confirm('Reset password for ' + u.name + '?')) return; const r = await api('admin/reset/' + u.id, 'POST'); prompt('Temporary password for ' + u.name + '. Share it with them and ask them to change it under Account:', r.temp); } }, 'Reset password'),
      h('button', { class: 'btn sm ' + (u.banned ? '' : 'ghost'), onclick: async () => { await api('admin/ban/' + u.id, 'POST'); toast('Updated'); viewAdmin(); } }, u.banned ? 'Unban' : 'Suspend'));
    return h('tr', null, h('td', null, u.name + (u.role === 'admin' ? ' (admin)' : '')), h('td', null, u.email), h('td', null, u.hostel), h('td', null, u.listings), h('td', null, act));
  });
  const reportsBox = h('div', { style: 'margin-bottom:32px' }, h('h2', { style: 'font-size:26px;margin-bottom:12px' }, 'Reports (' + d.reports.length + ')'), d.reports.length ? d.reports.map(r => h('div', { class: 'thread' }, h('div', null, h('b', null, r.title), h('small', null, r.reason + ' · reported by ' + r.by)), h('div', { class: 'row' }, h('a', { class: 'btn sm ghost', href: '#/item/' + r.listing }, 'Open'), h('button', { class: 'btn sm', onclick: async () => { await api('admin/report/' + r.id, 'POST'); toast('Dismissed'); viewAdmin(); } }, 'Dismiss')))) : h('p', { style: 'color:var(--muted)' }, 'No open reports. All clear.'));
  const table = h('table', null, h('thead', null, h('tr', null, ['Name', 'Email', 'Hostel', 'Listings', ''].map(x => h('th', null, x)))), h('tbody', null, rows));
  $app.replaceChildren(h('div', { class: 'wrap page' }, h('h1', null, 'Admin'),
    h('div', { class: 'stats' }, stat(d.users.length, 'Students'), stat(d.active, 'Active listings'), stat(d.listings, 'Total listings'), stat(d.messages, 'Messages')),
    reportsBox, h('div', { style: 'overflow-x:auto' }, table),
    h('p', { style: 'margin-top:22px;color:var(--muted)' }, 'To remove a listing, open it and use Delete listing.')));
}

/* ---------- router ---------- */
async function router() {
  if (cleanup) { cleanup(); cleanup = null; }
  const [a, b, c] = (location.hash.replace(/^#\/?/, '') || '').split('/');
  scrollTo(0, 0);
  try {
    if (!a) await viewHome();
    else if (a === 'market') await viewMarket(b || 'all');
    else if (a === 'item') await viewItem(b);
    else if (a === 'sell') await viewSell();
    else if (a === 'edit') await viewSell(b);
    else if (a === 'inbox') await viewInbox();
    else if (a === 'chat') await viewChat(b, c);
    else if (a === 'login') viewAuth(false);
    else if (a === 'register') viewAuth(true);
    else if (a === 'wishlist') await viewList('Saved items', 'wish', 'Nothing saved yet. Tap Save on any listing.');
    else if (a === 'mine') await viewList('My listings', 'listings?mine=1', 'You have not listed anything yet.');
    else if (a === 'account') viewAccount();
    else if (a === 'admin') await viewAdmin();
    else go('/');
  } catch (e) { renderNav(false); $app.replaceChildren(h('div', { class: 'wrap page' }, h('div', { class: 'empty' }, e.message))); }
}
addEventListener('hashchange', router); applyExam();
(async () => { try { user = (await api('me')).user; await refreshUnread(); } catch { } router(); })();
