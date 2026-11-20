// Funções usadas por todas as telas: acesso à API, ícones, modais, formatação e mensagens.
export const $ = (id) => document.getElementById(id);
export const state = { user: null, csrf: null, onModalClose: null, onSignOut: null };
export const roleNames = { GERENCIA: 'Gerência', ADMINISTRADOR: 'Administrador', PROFISSIONAL: 'Profissional', RECEPCIONISTA: 'Recepcionista' };
export const canEditPatients = () => ['GERENCIA', 'ADMINISTRADOR', 'RECEPCIONISTA'].includes(state.user?.role);
export const canManage = () => ['GERENCIA', 'ADMINISTRADOR'].includes(state.user?.role);

// ---------- Ícones ----------
const ICONS = {
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  power: '<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  arrowDownRight: '<path d="M7 7l10 10M17 7v10H7"/>',
  trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  bars: '<path d="M3 3v18h18"/><path d="M8 17v-5M12 17V8M16 17v-8"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  panelLeft: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6C22 6 17.5 2 12 2z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  access: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1.5"/><path d="M8 10l4 1 4-1M12 11v4M10 19l2-4 2 4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  door: '<path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14M2 20h20M14 12v.01"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  captions: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/>',
  pointer: '<path d="M14 4.1 12 6M5.1 8l-2.9-.8M6 12l-1.9 2M7.2 2.2 8 5.1M9 9l4.9 12 1.8-5.3 5.3-1.8z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  grid4: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
};
export const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
export function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstElementChild) el.innerHTML = svg(el.dataset.icon); });
}

// ---------- Formatação ----------
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const esc = escapeHTML;
export const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`);
export const addDays = (iso, days) => { const d = parseISO(iso); d.setDate(d.getDate() + days); return isoDate(d); };
export const dateBR = (value) => value ? parseISO(value).toLocaleDateString('pt-BR') : '—';
export const dateTimeBR = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export const dayMonth = (iso) => parseISO(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
export const longDate = (iso) => parseISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
export const monthName = (m) => new Date(2026, m, 1).toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase());
export const monthShort = (m) => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m];
export const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const maskCPF = (raw) => String(raw ?? '').replace(/\D/g, '').slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
export const maskPhone = (raw) => {
  const v = String(raw ?? '').replace(/\D/g, '').slice(0, 11);
  if (v.length < 3) return v;
  const n = v.slice(2), cut = n.length > 8 ? 5 : 4;
  return `(${v.slice(0, 2)}) ` + (n.length > 4 ? `${n.slice(0, cut)}-${n.slice(cut)}` : n);
};
export const ageFrom = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const b = parseISO(iso), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? String(age) : '';
};
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
export const minutes = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
export const hhmm = (mins) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

// ---------- Armazenamento simples do navegador ----------
export const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* indisponível */ } },
};

// ---------- Mensagens ----------
let toastTimeout;
const toastListeners = [];
export const onToast = (fn) => toastListeners.push(fn);
export function toast(message, failure = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', failure);
  el.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 4500);
  toastListeners.forEach((fn) => fn(message, failure));
}

// ---------- API (PostgreSQL) ----------
export async function api(path, options = {}) {
  const method = options.method || 'GET';
  let response;
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', headers: {
        ...(options.data ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && state.csrf ? { 'X-CSRF-Token': state.csrf } : {}),
      }, body: options.data ? JSON.stringify(options.data) : undefined,
    });
  } catch { throw new Error('Não foi possível conectar ao servidor. Verifique se o sistema está em execução.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('Resposta inválida do servidor.'); }
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/me' && path !== '/api/auth/login') state.onSignOut?.();
    throw new Error(data.error || 'Não foi possível concluir a operação.');
  }
  return data;
}
// Lista completa de pacientes do banco (usada por agenda, cobranças, relatórios e planos).
let patientCache = null;
export async function allPatients(force = false) {
  if (!patientCache || force) patientCache = (await api('/api/patients?status=all&per_page=500')).items;
  return patientCache;
}
export const clearPatientCache = () => { patientCache = null; };

// ---------- Modais ----------
export function openModal({ title, subtitle = '', iconName = 'file', size = '', html, compact = false }) {
  $('modal-title').textContent = title;
  $('modal-subtitle').textContent = subtitle;
  $('modal-subtitle').classList.toggle('hidden', !subtitle);
  $('modal-icon').innerHTML = svg(iconName);
  $('modal').className = `modal ${size} ${compact ? 'compact' : ''}`;
  $('modal-body').innerHTML = html;
  renderIcons($('modal-body'));
  $('modal-backdrop').classList.remove('hidden');
  $('modal-body').querySelector('input:not([type=hidden]):not([readonly]):not([type=checkbox]),select,textarea')?.focus();
}
export function closeModal() {
  if ($('modal-backdrop').classList.contains('hidden')) return;
  $('modal-backdrop').classList.add('hidden');
  $('modal-body').innerHTML = '';
  const callback = state.onModalClose; state.onModalClose = null;
  callback?.();
}
export function confirmDialog(title, message, confirmLabel, danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    state.onModalClose = () => { if (!answered) resolve(false); };
    openModal({ title, iconName: 'info', compact: true, html: `<div class="settings-body"><p class="confirm-text">${esc(message)}</p>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" id="confirm-modal">${esc(confirmLabel)}</button></div></div>` });
    $('confirm-modal').addEventListener('click', () => { answered = true; resolve(true); closeModal(); });
    $('confirm-modal').focus();
  });
}

// Campo no estilo do sistema (caixa com rótulo).
export const box = (id, label, control, full = false) => `<div class="field-box ${full ? 'full' : ''}"><label for="${id}">${label}</label>${control}</div>`;
export const options = (list, selected) => list.map((o) => {
  const [value, label] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(value)}" ${String(value) === String(selected ?? '') ? 'selected' : ''}>${esc(label)}</option>`;
}).join('');
// Lê um formulário como objeto.
export const formData = (form) => Object.fromEntries(new FormData(form).entries());
// Valida campos obrigatórios destacando os vazios. Retorna true se está tudo preenchido.
export function checkRequired(form, errorEl) {
  form.querySelectorAll('.field-box.invalid').forEach((el) => el.classList.remove('invalid'));
  const missing = [...form.querySelectorAll('[required]')].filter((el) => !String(el.value).trim());
  if (!missing.length) return true;
  missing.forEach((el) => el.closest('.field-box')?.classList.add('invalid'));
  if (errorEl) errorEl.textContent = 'Preencha os campos obrigatórios destacados.';
  missing[0].focus(); missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  return false;
}

// ---------- Gráficos simples em SVG ----------
export function lineChart(series, labels, { height = 200 } = {}) {
  const w = 600, h = height, padL = 46, padB = 26, padT = 10;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i) => padL + (i * (w - padL - 10)) / Math.max(1, labels.length - 1);
  const y = (v) => padT + (h - padT - padB) * (1 - v / max);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${padL}" x2="${w - 10}" y1="${y(max * f)}" y2="${y(max * f)}" class="chart-grid"/><text x="${padL - 6}" y="${y(max * f) + 4}" class="chart-label" text-anchor="end">${shortMoney(max * f)}</text>`).join('');
  const lines = series.map((s) => `<polyline class="chart-line ${s.cls}" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`).join('');
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${h - 6}" class="chart-label" text-anchor="middle">${l}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${grid}${lines}${xl}</svg>`;
}
export function barChart(values, labels, { height = 200, cls = '' } = {}) {
  const w = 600, h = height, padL = 46, padB = 26, padT = 10;
  const max = Math.max(1, ...values);
  const slot = (w - padL - 10) / Math.max(1, values.length);
  const y = (v) => padT + (h - padT - padB) * (1 - v / max);
  const grid = [0, 0.5, 1].map((f) => `<line x1="${padL}" x2="${w - 10}" y1="${y(max * f)}" y2="${y(max * f)}" class="chart-grid"/><text x="${padL - 6}" y="${y(max * f) + 4}" class="chart-label" text-anchor="end">${shortMoney(max * f)}</text>`).join('');
  const bars = values.map((v, i) => `<rect class="chart-bar ${cls}" x="${padL + i * slot + slot * 0.2}" y="${y(Math.max(0, v))}" width="${slot * 0.6}" height="${Math.max(0, h - padB - y(Math.max(0, v)))}" rx="3"><title>${labels[i]}: ${money(v)}</title></rect>`).join('');
  const xl = labels.map((l, i) => `<text x="${padL + i * slot + slot / 2}" y="${h - 6}" class="chart-label" text-anchor="middle">${l}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${grid}${bars}${xl}</svg>`;
}
export function hBarChart(rows, { cls = '', format = (v) => v } = {}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const w = 600, rowH = 34, padL = 140, h = rows.length * rowH + 10;
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${rows.map((r, i) => `<text x="${padL - 8}" y="${i * rowH + 24}" class="chart-label" text-anchor="end">${esc(r.label.slice(0, 20))}</text><rect class="chart-bar ${cls}" x="${padL}" y="${i * rowH + 8}" width="${Math.max(2, (w - padL - 70) * (r.value / max))}" height="22" rx="3"/><text x="${padL + Math.max(2, (w - padL - 70) * (r.value / max)) + 6}" y="${i * rowH + 24}" class="chart-label">${format(r.value)}</text>`).join('')}</svg>`;
}
const shortMoney = (v) => v >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : String(Math.round(v));

// ---------- Exportação ----------
export function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// "Exportar PDF": abre a impressão do navegador só com a área indicada (o usuário escolhe "Salvar como PDF").
export function printArea(el) {
  document.body.classList.add('printing');
  el.classList.add('print-area');
  const done = () => { document.body.classList.remove('printing'); el.classList.remove('print-area'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1000);
}

// Caminho no topo das telas: "Estúdio > Título".
export const crumb = (titulo) => `<nav class="breadcrumb">Estúdio ${svg('chevronRight')} <b>${esc(titulo)}</b></nav>`;
// Navegação entre telas sem import circular: app.js escuta este evento.
export const irPara = (pagina) => window.dispatchEvent(new CustomEvent('pm:ir', { detail: pagina }));
export const recarregar = () => window.dispatchEvent(new CustomEvent('pm:recarregar'));
