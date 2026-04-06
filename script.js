/* iCal v2 — Shared Utilities */
const API_BASE = 'https://calorie-ai-backend-dyko.onrender.com';

async function api(path, method = 'GET', body = null, _retry = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    if (_retry) {
      await new Promise(r => setTimeout(r, 3000));
      return api(path, method, body, false);
    }
    throw new Error('Server is starting up… wait 30 seconds and try again.');
  }
  if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

function setLoading(btn, on) { btn.classList.toggle('loading', on); btn.disabled = on; }

let _tt;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type ? ` toast-${type}` : '');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = '', 3400);
}

function validateEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function validateMin(v, n) { return v.length >= n; }
function markField(input, errId, valid, msg) {
  const err = document.getElementById(errId);
  input.classList.toggle('err', !valid);
  if (err) { err.textContent = valid ? '' : '⚠ ' + msg; err.classList.toggle('hidden', valid); }
  return valid;
}

function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 6) s++; if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/6e4), h = Math.floor(m/60), d = Math.floor(h/24);
  if (m < 1) return 'Just now'; if (m < 60) return m+'m ago';
  if (h < 24) return h+'h ago'; if (d === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

function isSameDay(iso, dateStr) {
  return new Date(iso).toDateString() === new Date(dateStr).toDateString();
}

const EMOJIS = {
  rice:'🍚',pasta:'🍝',noodle:'🍜',bread:'🍞',pizza:'🍕',burger:'🍔',
  sandwich:'🥪',wrap:'🌯',taco:'🌮',chicken:'🍗',beef:'🥩',steak:'🥩',
  pork:'🍖',fish:'🐟',salmon:'🐠',shrimp:'🍤',egg:'🥚',tofu:'🫘',
  turkey:'🦃',bacon:'🥓',salad:'🥗',broccoli:'🥦',carrot:'🥕',
  avocado:'🥑',corn:'🌽',tomato:'🍅',mushroom:'🍄',potato:'🥔',
  fries:'🍟',apple:'🍎',banana:'🍌',orange:'🍊',grape:'🍇',
  strawberry:'🍓',mango:'🥭',watermelon:'🍉',cake:'🎂',cookie:'🍪',
  donut:'🍩',chocolate:'🍫',icecream:'🍦',yogurt:'🥛',milk:'🥛',
  cheese:'🧀',coffee:'☕',latte:'☕',juice:'🥤',smoothie:'🥤',
  soda:'🥤',tea:'🍵',oatmeal:'🥣',pancake:'🥞',waffle:'🧇',
  soup:'🍲',curry:'🍛',sushi:'🍱',
};
function foodEmoji(name) {
  const n = name.toLowerCase().replace(/\s+/g,'');
  for (const [k,e] of Object.entries(EMOJIS)) if (n.includes(k)) return e;
  return '🍽️';
}

function animateNum(el, target, ms=700, decimals=0) {
  const start = Date.now();
  const tick = () => {
    const p = Math.min((Date.now()-start)/ms,1);
    el.textContent = decimals ? (p*target).toFixed(decimals) : Math.round(p*target);
    if (p<1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const ICONS = {
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  camera:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  sun:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sunrise:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 18a5 5 0 00-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg>`,
  chevronDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>`,
  chevronLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>`,
  edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  target:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  flame:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-7 7 7 7 0 01-7-7c0-1.153.433-2.294 1-3 .558.29 1.28.5 1.5.5z"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>`,
  award:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  trendingUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  zap:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  apple:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a3 3 0 003-3"/><path d="M9 7c-4 0-7 3.5-7 8a9 9 0 009 9c2 0 3.5-.5 4.5-1.5 1 1 2.5 1.5 4.5 1.5 2.5 0 6-1.5 6-9 0-4.5-3-8-7-8-1.5 0-2.8.6-3.5 1.5C14.8 7.6 13.5 7 12 7"/></svg>`,
};

function icon(name, cls='') {
  const svg = ICONS[name] || ICONS.plus;
  return cls ? svg.replace('<svg ', `<svg class="${cls}" `) : svg;
}
