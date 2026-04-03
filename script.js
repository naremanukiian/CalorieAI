/* ═══════════════════════════════════════════
   iCal — Shared Frontend Utilities
   ═══════════════════════════════════════════ */

const API_BASE = 'https://calorie-ai-backend-dyko.onrender.com';

/* ── API ──────────────────────────────────── */
async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running.');
  }
  if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

/* ── Loading ──────────────────────────────── */
function setLoading(btn, on) {
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

/* ── Toast ────────────────────────────────── */
let _tt;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type ? ` toast-${type}` : '');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = '', 3400);
}

/* ── Validation ───────────────────────────── */
function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function validateMin(v, n) { return v.length >= n; }
function markField(input, errId, valid, msg) {
  const err = document.getElementById(errId);
  input.classList.toggle('err', !valid);
  if (err) { err.textContent = valid ? '' : '⚠ ' + msg; err.classList.toggle('hidden', valid); }
  return valid;
}

/* ── Password strength ────────────────────── */
function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 6)  s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

/* ── Time helpers ─────────────────────────── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ── Food emoji ───────────────────────────── */
const EMOJIS = {
  rice:'🍚',pasta:'🍝',noodle:'🍜',bread:'🍞',pizza:'🍕',burger:'🍔',
  sandwich:'🥪',wrap:'🌯',taco:'🌮',burrito:'🌯',hotdog:'🌭',
  chicken:'🍗',beef:'🥩',steak:'🥩',pork:'🍖',fish:'🐟',salmon:'🐠',
  shrimp:'🍤',egg:'🥚',tofu:'🫘',turkey:'🦃',bacon:'🥓',
  salad:'🥗',broccoli:'🥦',carrot:'🥕',avocado:'🥑',corn:'🌽',
  tomato:'🍅',mushroom:'🍄',potato:'🥔',fries:'🍟',chips:'🍟',
  apple:'🍎',banana:'🍌',orange:'🍊',grape:'🍇',strawberry:'🍓',
  mango:'🥭',watermelon:'🍉',pineapple:'🍍',
  cake:'🎂',cookie:'🍪',donut:'🍩',chocolate:'🍫',icecream:'🍦',
  yogurt:'🥛',milk:'🥛',cheese:'🧀',butter:'🧈',
  coffee:'☕',latte:'☕',juice:'🥤',smoothie:'🥤',soda:'🥤',tea:'🍵',
  oatmeal:'🥣',pancake:'🥞',waffle:'🧇',cereal:'🥣',granola:'🥣',
  soup:'🍲',curry:'🍛',sushi:'🍱',dumpling:'🥟',
};
function foodEmoji(name) {
  const n = name.toLowerCase().replace(/\s+/g, '');
  for (const [k, e] of Object.entries(EMOJIS)) if (n.includes(k)) return e;
  return '🍽️';
}

/* ── Animate number ───────────────────────── */
function animateNum(el, target, ms = 700, decimals = 0) {
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now() - start) / ms, 1);
    const val = p * target;
    el.textContent = decimals ? val.toFixed(decimals) : Math.round(val);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── Macro color ──────────────────────────── */
function macroColor(type) {
  return { carbs: '#60a5fa', fat: '#f87171', protein: '#4ade80' }[type] || '#f5c842';
}
