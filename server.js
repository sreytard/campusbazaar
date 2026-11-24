'use strict';
// CampusBazaar server. Node 18+. Only dependency: mongodb (used when MONGODB_URI is set).
// Storage: MongoDB Atlas if MONGODB_URI is set, otherwise data/db.json (local mode).
// Photos: Cloudinary if CLOUDINARY_* variables are set, otherwise the uploads folder (local mode).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname, PUB = path.join(ROOT, 'public'), UP = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads'), DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME, CKEY = process.env.CLOUDINARY_API_KEY, CSECRET = process.env.CLOUDINARY_API_SECRET;
const USE_CLOUD = !!(CLOUD && CKEY && CSECRET);
const USE_MONGO = !!process.env.MONGODB_URI;
// Online payments: Cashfree. Test (sandbox) mode by default; set CASHFREE_ENV=production only after Cashfree activates your account.
const CF_ID = process.env.CASHFREE_APP_ID, CF_SECRET = process.env.CASHFREE_SECRET_KEY;
const USE_CF = !!(CF_ID && CF_SECRET), CF_SANDBOX = process.env.CASHFREE_ENV !== 'production';
const CF_BASE = CF_SANDBOX ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
if (!USE_CLOUD) fs.mkdirSync(UP, { recursive: true });
if (!USE_MONGO) fs.mkdirSync(DATA, { recursive: true });

/* ---------- storage ---------- */
const DB_FILE = path.join(DATA, 'db.json');
let db = null, col = null, SECRET = '', saveTimer = null, saving = Promise.resolve();

async function loadDb() {
  if (USE_MONGO) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    col = client.db(process.env.MONGODB_DB || 'campusbazaar').collection('state');
    const doc = await col.findOne({ _id: 'main' });
    if (doc) { delete doc._id; return doc; }
    return null;
  }
  return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : null;
}
function persist() {
  saving = saving.then(async () => {
    if (col) await col.replaceOne({ _id: 'main' }, { _id: 'main', ...db }, { upsert: true });
    else { fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE); }
  }).catch(e => console.error('Save failed:', e.message));
  return saving;
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 80); }
function flush() { clearTimeout(saveTimer); return persist(); }
['SIGTERM', 'SIGINT'].forEach(sg => process.on(sg, () => { if (!db) process.exit(0); flush().finally(() => process.exit(0)); }));
const nid = () => db.seq++;

/* ---------- auth helpers ---------- */
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
const verify = (pw, stored) => { const [s, h] = stored.split(':'); const t = hash(pw, s).split(':')[1]; return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(t, 'hex')); };
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
const makeSession = uid => { const v = uid + '.' + (Date.now() + 7 * 864e5); return v + '.' + sign(v); };
function sessionUser(req) {
  const m = /(?:^|; )sid=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return null;
  const [uid, exp, sig] = m[1].split('.');
  if (!sig || sign(uid + '.' + exp) !== sig || Date.now() > +exp) return null;
  const u = db.users.find(u => u.id === +uid); return u && !u.banned ? u : null;
}
const pub = u => u && ({ id: u.id, name: u.name, hostel: u.hostel, role: u.role, email: u.email });

/* ---------- seed ---------- */
function seed() {
  const mk = (name, email, hostel, role = 'student') => { const u = { id: nid(), name, email, hostel, role, pass: hash(role === 'admin' ? (process.env.ADMIN_PASSWORD || 'admin123') : 'student123'), created: Date.now() }; db.users.push(u); return u; };
  const a = mk('Campus Admin', 'admin@campus.edu', 'Admin Block', 'admin'), r = mk('Riya Sharma', 'riya@campus.edu', 'Hostel B'), m = mk('Aman Verma', 'aman@campus.edu', 'Block C'), k = mk('Kabir Singh', 'kabir@campus.edu', 'Hostel A');
  [[r, 'Engineering Mathematics, 3rd sem', 'books', 180, 'Good', 'Lightly highlighted, no torn pages. Same edition the department asked for.'],
   [r, 'Handwritten DBMS notes', 'books', 60, 'Good', 'Complete syllabus, neat handwriting, includes last 3 years of solved papers.'],
   [m, 'Hero Sprint cycle', 'gear', 2800, 'Good', 'Used for one year. New tyres, bell and a lock included.'],
   [m, 'Table lamp with clamp', 'gear', 350, 'Like new', 'Warm light, works on any desk edge.'],
   [k, 'Mini cooler, 1 year old', 'gear', 4200, 'Good', 'Cools a hostel room in 20 minutes. Original box available.'],
   [k, 'Poster and logo design', 'services', 300, 'New', 'Same-day delivery for fests and club events. Revisions included.'],
   [r, 'Maths tutoring, evenings', 'services', 200, 'New', 'Per hour. First-year calculus and linear algebra.'],
   [m, 'Homemade brownies, weekends', 'services', 90, 'New', 'Per box of 4. Order by Friday night.']
  ].forEach(x => db.listings.push({ id: nid(), seller: x[0].id, title: x[1], cat: x[2], price: x[3], cond: x[4], desc: x[5], image: null, status: 'active', pay: { upi: false, cod: true, upiId: '' }, created: Date.now() - Math.random() * 5e8 }));
}

/* ---------- http helpers ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const send = (res, code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => { let n = 0; const c = []; req.on('data', d => { n += d.length; if (n > 6e6) { no({ code: 413, msg: 'Request too large' }); req.destroy(); } else c.push(d); }); req.on('end', () => { try { ok(c.length ? JSON.parse(Buffer.concat(c)) : {}); } catch { no({ code: 400, msg: 'Invalid JSON' }); } }); });
const fail = (code, msg) => { throw { code, msg }; };
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const CATS = ['books', 'gear', 'services', 'fashion', 'other'];
const DEFAULT_PAY = { upi: false, cod: true, online: false, upiId: '' };
// Reads and checks the payment methods a seller picked: UPI (with a UPI ID) and/or cash on delivery.
function payFrom(b) {
  const upi = !!(b && b.upi), cod = !!(b && b.cod), online = !!(b && b.online), upiId = str(b && b.upiId, 60);
  if (!upi && !cod && !online) fail(400, 'Choose at least one payment method');
  if (online && !USE_CF) fail(400, 'Online payment is not set up on this server');
  if (upi && !/^[a-z0-9._-]{2,50}@[a-z][a-z0-9]{1,30}$/i.test(upiId)) fail(400, 'Enter a valid UPI ID, like name@okhdfcbank');
  return { upi, cod, online, upiId: upi ? upiId : '' };
}
function shape(l, me) {
  const s = db.users.find(u => u.id === l.seller) || {}, rs = db.ratings.filter(r => r.seller === l.seller);
  const talked = !!(me && me.id !== l.seller && db.messages.some(m => (m.from === me.id && m.to === l.seller) || (m.from === l.seller && m.to === me.id)));
  const pay = l.pay || DEFAULT_PAY; // older listings without a payment setting count as cash on delivery
  return { ...l, pay: me ? pay : { ...pay, upiId: '' }, sellerName: s.name, sellerHostel: s.hostel, wished: !!(me && db.wish.some(w => w.u === me.id && w.l === l.id)), wishes: db.wish.filter(w => w.l === l.id).length,
    sellerRating: rs.length ? +(rs.reduce((a, r) => a + r.stars, 0) / rs.length).toFixed(1) : null, sellerRatings: rs.length, canRate: talked, myStars: me ? (rs.find(r => r.from === me.id) || {}).stars || 0 : 0 };
}

/* ---------- photos: Cloudinary or local disk ---------- */
async function cloudCall(action, fields) {
  const ts = Math.floor(Date.now() / 1000), params = { ...fields, timestamp: ts };
  const toSign = Object.keys(params).filter(k => k !== 'file').sort().map(k => k + '=' + params[k]).join('&'); // 'file' is never part of the signature
  const form = new FormData();
  Object.keys(params).forEach(k => form.append(k, params[k]));
  form.append('api_key', CKEY);
  form.append('signature', crypto.createHash('sha1').update(toSign + CSECRET).digest('hex'));
  return fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/${action}`, { method: 'POST', body: form });
}
// Returns { url, pid } or null. pid is the Cloudinary id (null for local files).
async function saveImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl || ''); if (!m) return null;
  const buf = Buffer.from(m[2], 'base64'); if (buf.length > 4e6) fail(413, 'Image must be under 4 MB');
  if (USE_CLOUD) {
    const r = await cloudCall('upload', { file: dataUrl, folder: 'campusbazaar' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.secure_url) { console.error('Cloudinary upload failed:', j); fail(502, 'Photo upload failed. Try again.'); }
    return { url: j.secure_url, pid: j.public_id };
  }
  const name = crypto.randomBytes(8).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]); fs.writeFileSync(path.join(UP, name), buf);
  return { url: '/uploads/' + name, pid: null };
}
function dropImage(l) {
  if (!l || !l.image) return;
  if (l.imagePid && USE_CLOUD) cloudCall('destroy', { public_id: l.imagePid }).catch(() => { });
  else if (l.image.startsWith('/uploads/')) fs.unlink(path.join(UP, path.basename(l.image)), () => { });
  l.imagePid = null;
}
const limits = new Map(), seen = new Map();
function throttle(key, max, ms) { const now = Date.now(), r = (limits.get(key) || []).filter(t => now - t < ms); if (r.length >= max) fail(429, 'Too many attempts. Try again in a few minutes.'); r.push(now); limits.set(key, r); }

/* ---------- Cashfree (online payments) ---------- */
async function cf(method, route, body) {
  const r = await fetch(CF_BASE + route, { method, headers: { 'Content-Type': 'application/json', 'x-api-version': '2023-08-01', 'x-client-id': CF_ID, 'x-client-secret': CF_SECRET }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error('Cashfree error:', r.status, j); fail(502, j.message || 'Payment service error. Try again.'); }
  return j;
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const me = sessionUser(req), p = url.pathname.split('/').filter(Boolean).slice(1), M = req.method;
  const need = () => me || fail(401, 'Please sign in first');
  const body = M === 'GET' || M === 'DELETE' ? {} : await readBody(req);
  const cookie = v => `sid=${v}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${v ? 604800 : 0}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

  if (p[0] === 'register' && M === 'POST') {
    throttle('reg' + req.socket.remoteAddress, 10, 6e5);
    const email = str(body.email, 80).toLowerCase(), name = str(body.name, 40), pw = String(body.password || '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) fail(400, 'Enter your name and a valid email');
    if (pw.length < 6) fail(400, 'Password needs at least 6 characters');
    if (db.users.some(u => u.email === email)) fail(409, 'This email is already registered');
    const u = { id: nid(), name, email, hostel: str(body.hostel, 40) || 'Off campus', role: 'student', pass: hash(pw), created: Date.now() };
    db.users.push(u); save(); return send(res, 200, { user: pub(u) }, { 'Set-Cookie': cookie(makeSession(u.id)) });
  }
  if (p[0] === 'login' && M === 'POST') {
    throttle('log' + req.socket.remoteAddress, 15, 6e5);
    const u = db.users.find(u => u.email === str(body.email, 80).toLowerCase());
    if (!u || !verify(String(body.password || ''), u.pass)) fail(401, 'Wrong email or password');
    if (u.banned) fail(403, 'This account has been suspended');
    return send(res, 200, { user: pub(u) }, { 'Set-Cookie': cookie(makeSession(u.id)) });
  }
  if (p[0] === 'logout' && M === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': cookie('') });
  if (p[0] === 'activity') {
    seen.set(me ? 'u' + me.id : req.socket.remoteAddress || 'x', Date.now());
    const recent = db.listings.slice().sort((a, b) => b.created - a.created).slice(0, 8).map(l => ({ title: l.title, cat: l.cat, created: l.created, sellerName: (db.users.find(u => u.id === l.seller) || {}).name }));
    return send(res, 200, { online: [...seen.values()].filter(t => Date.now() - t < 12e4).length, students: db.users.length, active: db.listings.filter(l => l.status === 'active').length, recent });
  }
  if (p[0] === 'account' && M === 'POST') {
    need(); const name = str(body.name, 40), hostel = str(body.hostel, 40);
    if (!name) fail(400, 'Name cannot be empty');
    me.name = name; me.hostel = hostel || me.hostel;
    if (body.newPassword) {
      throttle('pw' + me.id, 8, 6e5);
      if (!verify(String(body.oldPassword || ''), me.pass)) fail(403, 'Current password is wrong');
      if (String(body.newPassword).length < 6) fail(400, 'New password needs at least 6 characters');
      me.pass = hash(String(body.newPassword));
    }
    save(); return send(res, 200, { user: pub(me) });
  }
  if (p[0] === 'me') return send(res, 200, { user: pub(me) });

  if (p[0] === 'config') return send(res, 200, { online: USE_CF, mode: CF_SANDBOX ? 'sandbox' : 'production' });
  if (p[0] === 'pay' && M === 'POST') {
    need(); throttle('pay' + me.id, 12, 6e5);
    if (!USE_CF) fail(503, 'Online payment is not set up on this server');
    if (p[1] === 'create') {
      const l = db.listings.find(x => x.id === +body.listing);
      if (!l || l.status !== 'active') fail(404, 'This item is not available');
      if (l.seller === me.id) fail(400, 'This is your own listing');
      if (!(l.pay && l.pay.online)) fail(400, 'The seller has not turned on online payment');
      if (l.price < 1) fail(400, 'Online payment needs a price of at least 1 rupee');
      const orderId = 'cb_' + l.id + '_' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      // customer_phone is a placeholder, fine for sandbox. For live mode, collect each buyer's real phone number.
      const j = await cf('POST', '/orders', { order_id: orderId, order_amount: l.price, order_currency: 'INR', customer_details: { customer_id: 'u' + me.id, customer_phone: '9999999999' }, order_note: ('CampusBazaar: ' + l.title).slice(0, 80) });
      db.orders.push({ id: orderId, listing: l.id, buyer: me.id, amount: l.price, status: 'created', at: Date.now() });
      save(); return send(res, 200, { orderId, sessionId: j.payment_session_id, mode: CF_SANDBOX ? 'sandbox' : 'production' });
    }
    if (p[1] === 'verify') {
      const o = db.orders.find(x => x.id === String(body.orderId) && x.buyer === me.id); if (!o) fail(404, 'Order not found');
      if (o.status !== 'paid') {
        const j = await cf('GET', '/orders/' + encodeURIComponent(o.id));
        if (j.order_status === 'PAID' && Number(j.order_amount) === o.amount) { // confirmed by Cashfree itself, not by the browser
          o.status = 'paid'; o.paidAt = Date.now();
          const l = db.listings.find(x => x.id === o.listing);
          if (l) {
            if (l.status === 'active') l.status = 'sold';
            db.messages.push({ id: nid(), listing: l.id, from: me.id, to: l.seller, text: 'I paid ' + o.amount + ' rupees online for "' + l.title + '"' + (CF_SANDBOX ? ' (test payment, no real money).' : '.'), at: Date.now(), read: false });
          }
          save();
        }
      }
      return send(res, 200, { paid: o.status === 'paid' });
    }
  }
  if (p[0] === 'listings') {
    if (!p[1] && M === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase(), cat = url.searchParams.get('cat'), sort = url.searchParams.get('sort') || 'new', mine = url.searchParams.get('mine');
      let r = db.listings.filter(l => mine ? me && l.seller === me.id : l.status === 'active');
      if (cat && cat !== 'all') r = r.filter(l => l.cat === cat);
      if (q) r = r.filter(l => (l.title + ' ' + l.desc).toLowerCase().includes(q));
      r.sort(sort === 'low' ? (a, b) => a.price - b.price : sort === 'high' ? (a, b) => b.price - a.price : (a, b) => b.created - a.created);
      return send(res, 200, { listings: r.map(l => shape(l, me)) });
    }
    if (!p[1] && M === 'POST') {
      need();
      const title = str(body.title, 80), price = Math.round(+body.price);
      if (title.length < 3) fail(400, 'Give your listing a title');
      if (!(price >= 0 && price <= 1e6)) fail(400, 'Enter a valid price');
      const pay = body.pay === undefined ? { ...DEFAULT_PAY } : payFrom(body.pay);
      if (db.listings.filter(l => l.seller === me.id && Date.now() - l.created < 6e4).length >= 3) fail(429, 'Slow down a little before posting again');
      const img = await saveImage(body.image);
      const l = { id: nid(), seller: me.id, title, cat: CATS.includes(body.cat) ? body.cat : 'other', price, cond: str(body.cond, 20) || 'Good', desc: str(body.desc, 800), image: img ? img.url : null, imagePid: img ? img.pid : null, status: 'active', pay, created: Date.now() };
      db.listings.push(l); save(); return send(res, 201, { listing: shape(l, me) });
    }
    const l = db.listings.find(x => x.id === +p[1]); if (!l) fail(404, 'Listing not found');
    if (M === 'GET') return send(res, 200, { listing: shape(l, me) });
    need(); if (l.seller !== me.id && me.role !== 'admin') fail(403, 'Not your listing');
    if (M === 'DELETE') { dropImage(l); db.listings = db.listings.filter(x => x !== l); db.wish = db.wish.filter(w => w.l !== l.id); db.reports.forEach(r => { if (r.listing === l.id) r.done = true; }); save(); return send(res, 200, { ok: true }); }
    if (M === 'PUT') {
      const title = str(body.title, 80), price = Math.round(+body.price);
      if (title.length < 3) fail(400, 'Give your listing a title'); if (!(price >= 0 && price <= 1e6)) fail(400, 'Enter a valid price');
      if (body.pay !== undefined) l.pay = payFrom(body.pay);
      l.title = title; l.price = price; l.cat = CATS.includes(body.cat) ? body.cat : l.cat; l.cond = str(body.cond, 20) || l.cond; l.desc = str(body.desc, 800);
      if (body.image) { const n = await saveImage(body.image); if (n) { dropImage(l); l.image = n.url; l.imagePid = n.pid; } } else if (body.removeImage) { dropImage(l); l.image = null; }
      save(); return send(res, 200, { listing: shape(l, me) });
    }
    if (M === 'POST' && p[2] === 'status') { l.status = l.status === 'sold' ? 'active' : 'sold'; save(); return send(res, 200, { listing: shape(l, me) }); }
  }
  if (p[0] === 'wish') {
    need();
    if (M === 'GET') return send(res, 200, { listings: db.wish.filter(w => w.u === me.id).map(w => db.listings.find(l => l.id === w.l)).filter(Boolean).map(l => shape(l, me)) });
    const id = +p[1]; if (!db.listings.some(l => l.id === id)) fail(404, 'Listing not found');
    const i = db.wish.findIndex(w => w.u === me.id && w.l === id);
    if (i >= 0) db.wish.splice(i, 1); else db.wish.push({ u: me.id, l: id });
    save(); return send(res, 200, { wished: i < 0 });
  }
  if (p[0] === 'messages') {
    need();
    if (!p[1] && M === 'GET') { // inbox: one row per (listing, other person)
      const t = new Map();
      db.messages.filter(m => m.from === me.id || m.to === me.id).forEach(m => { const o = m.from === me.id ? m.to : m.from, k = m.listing + '-' + o; t.set(k, { listing: m.listing, other: o, last: m.text, at: m.at, unread: m.to === me.id && !m.read }); });
      return send(res, 200, { threads: [...t.values()].sort((a, b) => b.at - a.at).map(x => ({ ...x, otherName: (db.users.find(u => u.id === x.other) || {}).name, title: (db.listings.find(l => l.id === x.listing) || {}).title || 'Removed listing' })) });
    }
    if (M === 'GET') {
      const lid = +p[1], o = +p[2], msgs = db.messages.filter(m => m.listing === lid && ((m.from === me.id && m.to === o) || (m.from === o && m.to === me.id)));
      msgs.forEach(m => { if (m.to === me.id) m.read = true; }); save();
      return send(res, 200, { messages: msgs, other: pub(db.users.find(u => u.id === o)) });
    }
    if (M === 'POST') {
      const text = str(body.text, 500), to = +body.to, lid = +body.listing;
      if (!text) fail(400, 'Write a message first'); if (to === me.id || !db.users.some(u => u.id === to)) fail(400, 'Invalid recipient');
      throttle('msg' + me.id, 30, 6e4);
      const m = { id: nid(), listing: lid, from: me.id, to, text, at: Date.now(), read: false }; db.messages.push(m); save(); return send(res, 201, { message: m });
    }
  }
  if (p[0] === 'rate' && M === 'POST') {
    need(); const sid = +body.seller, stars = Math.round(+body.stars);
    if (!(stars >= 1 && stars <= 5)) fail(400, 'Pick 1 to 5 stars');
    if (sid === me.id || !db.users.some(u => u.id === sid)) fail(400, 'You cannot rate this seller');
    if (!db.messages.some(m => (m.from === me.id && m.to === sid) || (m.from === sid && m.to === me.id))) fail(403, 'Message the seller before rating them');
    const r = db.ratings.find(r => r.seller === sid && r.from === me.id);
    if (r) { r.stars = stars; r.at = Date.now(); } else db.ratings.push({ id: nid(), seller: sid, from: me.id, stars, at: Date.now() });
    save(); return send(res, 200, { ok: true });
  }
  if (p[0] === 'report' && M === 'POST') {
    need(); const l = db.listings.find(x => x.id === +body.listing), reason = str(body.reason, 200);
    if (!l) fail(404, 'Listing not found'); if (l.seller === me.id) fail(400, 'This is your own listing'); if (reason.length < 3) fail(400, 'Tell us briefly what is wrong');
    throttle('rep' + me.id, 5, 6e5);
    if (db.reports.some(r => r.listing === l.id && r.from === me.id && !r.done)) fail(409, 'You already reported this listing');
    db.reports.push({ id: nid(), listing: l.id, from: me.id, reason, at: Date.now(), done: false }); save(); return send(res, 200, { ok: true });
  }
  if (p[0] === 'admin') {
    need(); if (me.role !== 'admin') fail(403, 'Admins only');
    if (p[1] === 'stats') return send(res, 200, { users: db.users.map(u => ({ ...pub(u), banned: !!u.banned, listings: db.listings.filter(l => l.seller === u.id).length })), listings: db.listings.length, active: db.listings.filter(l => l.status === 'active').length, messages: db.messages.length,
      reports: db.reports.filter(r => !r.done && db.listings.some(l => l.id === r.listing)).map(r => ({ id: r.id, listing: r.listing, title: db.listings.find(l => l.id === r.listing).title, reason: r.reason, by: (db.users.find(u => u.id === r.from) || {}).name })) });
    if (p[1] === 'report' && M === 'POST') { const r = db.reports.find(x => x.id === +p[2]); if (r) { r.done = true; save(); } return send(res, 200, { ok: true }); }
    if (p[1] === 'reset' && M === 'POST') { const u = db.users.find(u => u.id === +p[2]); if (!u || u.role === 'admin') fail(400, 'Cannot reset this user'); const tmp = crypto.randomBytes(4).toString('hex'); u.pass = hash(tmp); save(); return send(res, 200, { temp: tmp }); }
    if (p[1] === 'ban' && M === 'POST') { const u = db.users.find(u => u.id === +p[2]); if (!u || u.role === 'admin') fail(400, 'Cannot change this user'); u.banned = !u.banned; save(); return send(res, 200, { banned: u.banned }); }
  }
  fail(404, 'Not found');
}

/* ---------- static + router ---------- */
function serveFile(res, file, cache) {
  fs.readFile(file, (e, d) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': cache });
    res.end(d);
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/healthz') return send(res, 200, { ok: true });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const root = url.pathname.startsWith('/uploads/') ? UP : PUB;
    const rel = decodeURIComponent(url.pathname.replace(/^\/uploads/, '')) || '/';
    const file = path.normalize(path.join(root, rel === '/' ? 'index.html' : rel));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    serveFile(res, file, root === UP ? 'public, max-age=604800' : 'no-cache');
  } catch (e) { send(res, e.code || 500, { error: e.msg || 'Something went wrong' }); if (!e.code) console.error(e); }
});

/* ---------- start ---------- */
(async () => {
  db = (await loadDb()) || { seq: 1, users: [], listings: [], messages: [], wish: [] };
  db.ratings = db.ratings || []; db.reports = db.reports || []; db.orders = db.orders || [];
  if (!db.secret) db.secret = crypto.randomBytes(32).toString('hex'); // kept in the database so logins survive restarts
  SECRET = db.secret;
  if (!db.users.length) seed();
  await flush();
  server.listen(PORT, () => console.log(`\n  CampusBazaar running at http://localhost:${PORT}\n  Data: ${USE_MONGO ? 'MongoDB Atlas' : 'local file'} | Photos: ${USE_CLOUD ? 'Cloudinary' : 'local folder'}\n`));
})().catch(e => { console.error('Startup failed:', e.message); process.exit(1); });
