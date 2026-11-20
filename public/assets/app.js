// PilaManager 2.1 — interface da demonstração (login, pacientes e usuários integrados ao PostgreSQL).
const $ = (id) => document.getElementById(id);
const state = { user: null, csrf: null, page: 'dashboard', pageNumber: 1, pages: 1, status: 'all', search: '', patients: [], onModalClose: null };
const roleNames = { GERENCIA: 'Gerência', ADMINISTRADOR: 'Administrador', PROFISSIONAL: 'Profissional', RECEPCIONISTA: 'Recepcionista' };
const canEditPatients = () => ['GERENCIA','ADMINISTRADOR','RECEPCIONISTA'].includes(state.user?.role);
const canManageUsers = () => ['GERENCIA','ADMINISTRADOR'].includes(state.user?.role);

// ---------- Ícones (traço no estilo do sistema original) ----------
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
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  power: '<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  panelLeft: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const icon = (name, cls = '') => `<span class="${cls}" data-icon="${name}">${svg(name)}</span>`;
function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstElementChild) el.innerHTML = svg(el.dataset.icon); });
}

// ---------- Utilitários ----------
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateBR = (value) => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const dayMonth = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const maskCPF = (raw) => String(raw ?? '').replace(/\D/g, '').slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
const maskPhone = (raw) => {
  const v = String(raw ?? '').replace(/\D/g,'').slice(0,11);
  if (v.length < 3) return v;
  const n = v.slice(2), cut = n.length > 8 ? 5 : 4;
  return `(${v.slice(0,2)}) ` + (n.length > 4 ? `${n.slice(0,cut)}-${n.slice(cut)}` : n);
};
const ageFrom = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const b = new Date(`${iso}T12:00:00`), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? String(age) : '';
};
const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ } },
};

let toastTimeout;
function toast(message, failure = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', failure);
  el.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 4500);
}

async function api(path, options = {}) {
  const method = options.method || 'GET';
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', headers: {
      ...(options.data ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' && state.csrf ? { 'X-CSRF-Token': state.csrf } : {}),
    }, body: options.data ? JSON.stringify(options.data) : undefined });
  } catch { throw new Error('Não foi possível conectar ao servidor. Verifique se o sistema está em execução.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('Resposta inválida do servidor.'); }
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/me' && path !== '/api/auth/login') signOutLocally();
    throw new Error(data.error || 'Não foi possível concluir a operação.');
  }
  return data;
}

// ---------- Tema ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-action="toggle-theme"]').forEach((b) => { b.innerHTML = svg(theme === 'dark' ? 'sun' : 'moon'); });
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  store.set('plm_theme', next);
  applyTheme(next);
}

// ---------- Modal ----------
function openModal({ title, iconName = 'file', compact = false, html }) {
  $('modal-title').textContent = title;
  $('modal-icon').innerHTML = svg(iconName);
  $('modal').classList.toggle('compact', compact);
  $('modal-body').innerHTML = html;
  renderIcons($('modal-body'));
  $('modal-backdrop').classList.remove('hidden');
  $('modal-body').querySelector('input:not([type=hidden]):not([readonly]),select,textarea')?.focus();
}
function closeModal() {
  if ($('modal-backdrop').classList.contains('hidden')) return;
  $('modal-backdrop').classList.add('hidden');
  $('modal-body').innerHTML = '';
  const callback = state.onModalClose; state.onModalClose = null;
  callback?.();
}
function confirmDialog(title, message, confirmLabel, danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    state.onModalClose = () => { if (!answered) resolve(false); };
    openModal({ title, iconName: 'info', compact: true, html: `<div class="settings-body"><p class="confirm-text">${escapeHTML(message)}</p>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" id="cancel-modal">Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" id="confirm-modal">${escapeHTML(confirmLabel)}</button></div></div>` });
    $('cancel-modal').addEventListener('click', closeModal);
    $('confirm-modal').addEventListener('click', () => { answered = true; resolve(true); closeModal(); });
    $('confirm-modal').focus();
  });
}
function privacyModal() {
  openModal({ title: 'Política de Privacidade', iconName: 'shield', html: `<div class="modal-content privacy-text">
    <p>Esta é uma <b>demonstração acadêmica</b> do PilaManager 2.1. Use somente dados fictícios.</p>
    <h3>Quais dados são guardados</h3><p>Dados cadastrais dos pacientes (nome, CPF, nascimento, contato) e informações de acompanhamento informadas no cadastro, além das contas de acesso da equipe.</p>
    <h3>Como são protegidos</h3><p>Os dados ficam no banco PostgreSQL deste computador. As senhas são guardadas apenas como hash e o acesso exige login, com permissões por cargo.</p>
    <h3>Consentimento</h3><p>O cadastro de um paciente registra a data em que o consentimento para o tratamento dos dados foi aceito.</p>
    <div class="modal-actions"><button class="btn btn-primary" type="button" id="cancel-modal">Entendi</button></div></div>` });
  $('cancel-modal').addEventListener('click', closeModal);
}

// ---------- Sessão ----------
function signOutLocally() {
  state.user = null; state.csrf = null;
  closeModal();
  $('login-view').classList.remove('hidden');
  $('app-view').classList.add('hidden');
  $('login-password').value = '';
}
function signedIn(user, csrf) {
  state.user = user; state.csrf = csrf;
  $('login-view').classList.add('hidden');
  $('app-view').classList.remove('hidden');
  $('login-error').textContent = '';
  $('user-name').textContent = user.name;
  $('user-role').textContent = roleNames[user.role] || user.role;
  $('user-initials').textContent = initials(user.name);
  $('menu-users').classList.toggle('hidden', !canManageUsers());
  $('new-patient').classList.toggle('hidden', !canEditPatients());
  $('today-date').textContent = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  showPage('dashboard');
}
function rememberAccount(email) {
  const accounts = store.get('plm_saved_accounts', []).filter((e) => e !== email);
  store.set('plm_saved_accounts', [email, ...accounts].slice(0, 5));
}

// ---------- Navegação ----------
function showPage(page, moduleName = '') {
  state.page = page;
  document.querySelectorAll('.page').forEach((el) => el.classList.add('hidden'));
  $(`page-${page}`).classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('selected',
    b.dataset.page === page && (page !== 'module' || b.dataset.module === moduleName)));
  $('sidebar').classList.remove('open');
  if (page === 'dashboard') loadDashboard();
  if (page === 'patients') loadPatients();
  if (page === 'module') { $('module-title').textContent = moduleName; $('module-crumb').textContent = moduleName; }
  $('content').scrollTop = 0; window.scrollTo(0, 0);
}

// ---------- Visão Geral ----------
async function loadDashboard() {
  $('month-name').textContent = new Date().toLocaleDateString('pt-BR', { month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  try {
    const s = await api('/api/patients/summary');
    $('stat-active').textContent = s.active;
    $('stat-total').textContent = s.total;
    $('stat-inactive').textContent = s.inactive;
    $('stat-birthdays').textContent = s.birthdaysThisMonth.length;
    $('recent-list').innerHTML = s.recent.length ? s.recent.map((p) => `<div class="soft-item"><span class="time">${dayMonth(p.created_at.slice(0,10))}</span><div class="grow"><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.email || 'sem e-mail')}</small></div></div>`).join('') : '<p class="empty">Nenhum paciente cadastrado ainda.</p>';
    $('birthdays-month').innerHTML = s.birthdaysThisMonth.length ? s.birthdaysThisMonth.map((p) => `<div class="soft-item"><span class="day-badge orange">${svg('cake')}</span><div class="grow"><b>${escapeHTML(p.name)}</b><small>Dia ${p.day} · ${p.turning} anos</small></div></div>`).join('') : '<p class="empty">Nenhum aniversariante neste mês.</p>';
    $('birthdays-next').innerHTML = s.upcomingBirthdays.length ? s.upcomingBirthdays.map((p) => `<div class="soft-item"><span class="day-badge">${p.daysUntil === 0 ? 'hoje' : p.daysUntil + 'd'}</span><div class="grow"><b>${escapeHTML(p.name)}</b><small>${dayMonth(p.next)}</small></div>${svg('chevronRight')}</div>`).join('') : '<p class="empty">Cadastre a data de nascimento para ver aniversários.</p>';
  } catch (e) { toast(e.message, true); }
}

// ---------- Pacientes ----------
async function loadPatients() {
  const qs = new URLSearchParams({ page: String(state.pageNumber), status: state.status, search: state.search });
  $('patient-search').value = state.search;
  $('patient-filter').value = state.status;
  $('patient-rows').innerHTML = '<tr><td class="empty-row" colspan="6">Carregando pacientes...</td></tr>';
  try {
    const [data, summary] = await Promise.all([api(`/api/patients?${qs}`), api('/api/patients/summary')]);
    state.patients = data.items; state.pages = data.pages;
    $('patient-counts').textContent = `${summary.active} ativos · ${summary.total} total`;
    $('patient-total').textContent = `${data.total} resultado${data.total === 1 ? '' : 's'}`;
    $('pagination').classList.toggle('hidden', data.pages <= 1);
    $('page-label').textContent = `${data.page} / ${data.pages}`;
    $('prev-page').disabled = data.page <= 1;
    $('next-page').disabled = data.page >= data.pages;
    if (!data.items.length) {
      $('patient-rows').innerHTML = '<tr><td class="empty-row" colspan="6">Nenhum paciente encontrado.</td></tr>';
      return;
    }
    $('patient-rows').innerHTML = data.items.map((p) => `<tr>
      <td><div class="person"><span class="avatar sm">${escapeHTML(p.name.trim()[0]?.toUpperCase() || '?')}</span><div><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.email || 'sem e-mail')}</small><span class="badge mobile-only ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}${p.age != null ? ` · ${p.age} anos` : ''}</span></div></div></td>
      <td class="col-age">${p.age != null ? `${p.age} anos` : '—'}</td>
      <td class="col-cpf">${p.cpf ? maskCPF(p.cpf) : '—'}</td>
      <td class="col-date">${dateBR(p.created_at)}</td>
      <td class="col-status"><span class="badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
      <td class="right"><div class="row-actions">
        <button type="button" data-action="view" data-id="${p.id}" title="Ver ficha" aria-label="Ver ficha de ${escapeHTML(p.name)}">${svg('eye')}</button>
        ${canEditPatients() ? `<button type="button" class="edit" data-action="edit" data-id="${p.id}" title="Editar" aria-label="Editar ${escapeHTML(p.name)}">${svg('pencil')}</button>
        <button type="button" class="power ${p.active ? '' : 'on'}" data-action="status" data-id="${p.id}" title="${p.active ? 'Inativar' : 'Reativar'}" aria-label="${p.active ? 'Inativar' : 'Reativar'} ${escapeHTML(p.name)}">${svg('power')}</button>` : ''}
      </div></td></tr>`).join('');
  } catch (e) {
    $('patient-rows').innerHTML = '<tr><td class="empty-row" colspan="6">Não foi possível carregar os pacientes.</td></tr>';
    toast(e.message, true);
  }
}

const textFields = [
  ['special_notes', 'Notas Especiais (ex: preferências de horário, observações importantes)', 'Ex: Prefere não conversar durante sessão, disponível apenas manhãs, etc.'],
  ['disabilities', 'Deficiências', 'Descreva se há alguma deficiência...'],
  ['health_problems', 'Problemas de Saúde', 'Descreva problemas de saúde relevantes...'],
  ['pain_limitations', 'Dores e Limitações', 'Descreva dores ou limitações físicas...'],
  ['clinical_notes', 'Queixas e Observações', 'Outras queixas ou observações importantes...'],
  ['goals', 'Objetivos', 'O que o paciente busca alcançar...'],
];
const box = (id, label, control, full = false) => `<div class="field-box ${full ? 'full' : ''}"><label for="${id}">${label}</label>${control}</div>`;

function patientModal(patient = null) {
  if (!canEditPatients()) return toast('Você não tem permissão para alterar pacientes.', true);
  const editing = Boolean(patient);
  const v = (key) => escapeHTML(patient?.[key] ?? '');
  openModal({ title: editing ? 'Editar Paciente' : 'Novo Paciente', iconName: 'file', html: `
    <form id="patient-form" class="modal-content" novalidate>
      <div class="form-grid">
        ${box('f-name', 'Nome Completo *', `<input id="f-name" name="name" placeholder="Nome do paciente" maxlength="150" required value="${v('name')}" />`)}
        ${box('f-age', 'Idade *', `<input id="f-age" placeholder="0" readonly value="${ageFrom(patient?.birth_date) || ''}" title="Calculada pela data de nascimento" />`)}
        ${box('f-cpf', 'CPF *', `<input id="f-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14" required value="${patient?.cpf ? maskCPF(patient.cpf) : ''}" />`)}
        ${box('f-birth', 'Data de Nascimento *', `<input id="f-birth" name="birth_date" type="date" required max="${new Date().toISOString().slice(0,10)}" value="${v('birth_date')}" />`)}
        ${box('f-email', 'Email *', `<input id="f-email" name="email" type="email" placeholder="email@exemplo.com" maxlength="254" required value="${v('email')}" />`)}
        ${box('f-phone', 'Telefone', `<input id="f-phone" name="phone" type="tel" placeholder="(00) 00000-0000" maxlength="16" value="${patient?.phone ? maskPhone(patient.phone) : ''}" />`)}
        ${textFields.map(([key, label, ph]) => box(`f-${key}`, label, `<textarea id="f-${key}" name="${key}" placeholder="${ph}" maxlength="2000">${v(key)}</textarea>`, true)).join('')}
        ${editing
          ? `<p class="consent">${svg('shield')} Consentimento de privacidade ${patient.privacy_consent_at ? 'registrado em ' + dateBR(patient.privacy_consent_at) : 'não registrado'}.</p>`
          : '<label class="consent"><input type="checkbox" id="f-consent" /> Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados.</label>'}
      </div>
      <div id="modal-error" class="form-error" role="alert"></div>
      <div class="modal-actions stretch"><button class="btn btn-primary btn-wide" type="submit" id="save-patient">${editing ? 'Salvar Alterações' : 'Cadastrar Paciente'}</button></div>
    </form>` });
  $('f-cpf').addEventListener('input', (e) => { e.target.value = maskCPF(e.target.value); });
  $('f-phone').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
  $('f-birth').addEventListener('input', (e) => { $('f-age').value = ageFrom(e.target.value); });
  $('patient-form').addEventListener('input', (e) => e.target.closest('.field-box')?.classList.remove('invalid'));
  $('patient-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    // Destaca obrigatórios vazios e leva o usuário até o primeiro (o formulário é longo).
    const missing = [...event.currentTarget.querySelectorAll('[required]')].filter((el) => !el.value.trim());
    event.currentTarget.querySelectorAll('.field-box.invalid').forEach((el) => el.classList.remove('invalid'));
    if (missing.length) {
      missing.forEach((el) => el.closest('.field-box').classList.add('invalid'));
      $('modal-error').textContent = 'Preencha os campos obrigatórios destacados.';
      missing[0].focus(); missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!editing) payload.privacy_consent = $('f-consent').checked;
    const submit = $('save-patient'); submit.disabled = true;
    $('modal-error').textContent = '';
    try {
      await api(editing ? `/api/patients/${patient.id}` : '/api/patients', { method: editing ? 'PATCH' : 'POST', data: payload });
      closeModal();
      toast(editing ? 'Paciente atualizado com sucesso.' : 'Paciente cadastrado com sucesso.');
      if (!editing) { state.pageNumber = 1; state.search = ''; state.status = 'all'; }
      await loadPatients();
    } catch (e) {
      $('modal-error').textContent = e.message;
      $('modal-error').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } finally { submit.disabled = false; }
  });
}
async function patientDetail(id) {
  try {
    const { patient: p } = await api(`/api/patients/${id}`);
    const rows = [['Nome', p.name], ['Idade', p.age != null ? `${p.age} anos` : '—'], ['CPF', p.cpf ? maskCPF(p.cpf) : '—'], ['Data de Nascimento', dateBR(p.birth_date)],
      ['E-mail', p.email || '—'], ['Telefone', p.phone ? maskPhone(p.phone) : '—'], ['Situação', p.active ? 'Ativo' : 'Inativo'], ['Cadastro', dateBR(p.created_at)],
      ...textFields.map(([key, label]) => [label.replace(/ \(.*\)$/, ''), p[key] || '—'])];
    openModal({ title: 'Ficha do Paciente', iconName: 'user', html: `<div class="modal-content"><dl class="detail-grid">${rows.map(([k, val], i) => `<div class="${i >= 8 ? 'full' : ''}"><dt>${escapeHTML(k)}</dt><dd>${escapeHTML(val)}</dd></div>`).join('')}</dl>
      <div class="modal-actions">${canEditPatients() ? '<button class="btn btn-ghost" type="button" id="detail-edit">Editar</button>' : ''}<button class="btn btn-primary" type="button" id="cancel-modal">Fechar</button></div></div>` });
    $('cancel-modal').addEventListener('click', closeModal);
    $('detail-edit')?.addEventListener('click', () => { closeModal(); patientModal(p); });
  } catch (e) { toast(e.message, true); }
}
async function changePatientStatus(p) {
  const action = p.active ? 'Inativar' : 'Reativar';
  const message = p.active
    ? `${p.name} deixará de aparecer entre os pacientes ativos. O cadastro continua salvo no banco e pode ser reativado depois.`
    : `${p.name} voltará a aparecer entre os pacientes ativos.`;
  if (!(await confirmDialog(`${action} paciente`, message, action, p.active))) return;
  try {
    await api(`/api/patients/${p.id}/status`, { method: 'PATCH', data: { active: !p.active } });
    toast(`Paciente ${p.active ? 'inativado' : 'reativado'} com sucesso.`);
    await loadPatients();
  } catch (e) { toast(e.message, true); }
}

// ---------- Configurações: Meu Perfil e Usuários do Sistema ----------
function openSettings(tab = 'profile') {
  if (tab === 'users' && !canManageUsers()) tab = 'profile';
  const tabs = [['profile', 'user', 'Meu Perfil'], ...(canManageUsers() ? [['users', 'users', 'Usuários do Sistema']] : [])];
  openModal({ title: 'Configurações', compact: true, html: `<div class="tabs">${tabs.map(([key, ic, label]) => `<button type="button" data-tab="${key}" class="${key === tab ? 'selected' : ''}">${svg(ic)}${label}</button>`).join('')}</div><div id="settings-panel"></div>` });
  $('modal-body').querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    $('modal-body').querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('selected', x === b));
    renderSettings(b.dataset.tab);
  }));
  renderSettings(tab);
}
function renderSettings(tab) {
  const panel = $('settings-panel');
  if (tab === 'profile') {
    const u = state.user;
    panel.innerHTML = `<div class="settings-title">Meu Perfil</div><div class="settings-body">
      <div class="user-row"><span class="avatar">${escapeHTML(initials(u.name))}</span><div class="grow"><b>${escapeHTML(u.name)}</b><small>${escapeHTML(u.email)} · ${roleNames[u.role]}</small></div><span class="badge active">Ativo</span></div>
      <p class="confirm-text">Seus dados de acesso estão guardados no PostgreSQL. A senha é armazenada apenas como hash.</p></div>`;
    return;
  }
  loadUsers(panel);
}
async function loadUsers(panel) {
  panel.innerHTML = '<div class="settings-title">Usuários do Sistema</div><div class="settings-body"><p class="empty">Carregando usuários...</p></div>';
  try {
    const { items } = await api('/api/users');
    panel.innerHTML = `<div class="settings-title">Usuários do Sistema</div><div class="settings-body">
      <div class="settings-bar"><span>Gerencie contas de acesso ao sistema.</span><button class="btn btn-primary" type="button" id="new-user">${svg('plus')}Novo</button></div>
      ${items.map((u) => {
        const self = u.id === state.user.id;
        const locked = self || (u.role === 'GERENCIA' && state.user.role !== 'GERENCIA');
        return `<div class="user-row"><span class="avatar sm">${escapeHTML(u.name.trim()[0]?.toUpperCase() || '?')}</span>
          <div class="grow"><b>${escapeHTML(u.name)}${self ? '<span class="you">(você)</span>' : ''}</b><small>${escapeHTML(u.email)} · ${roleNames[u.role] || u.role}</small></div>
          <span class="badge ${u.active ? 'active' : 'inactive'}">${u.active ? 'Ativo' : 'Inativo'}</span>
          <div class="row-actions">${locked ? '' : `<button type="button" class="power ${u.active ? '' : 'on'}" data-user="${u.id}" data-active="${u.active}" data-name="${escapeHTML(u.name)}" title="${u.active ? 'Desativar' : 'Ativar'}" aria-label="${u.active ? 'Desativar' : 'Ativar'} ${escapeHTML(u.name)}">${svg('power')}</button>`}</div></div>`;
      }).join('')}</div>`;
    $('new-user').addEventListener('click', () => newUserForm(panel));
    panel.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => toggleUser(b.dataset.user, b.dataset.active === 'true', b.dataset.name, panel)));
  } catch (e) { panel.innerHTML = `<div class="settings-body"><p class="form-error">${escapeHTML(e.message)}</p></div>`; }
}
async function toggleUser(id, active, name, panel) {
  if (active) {
    // Confirmação dentro do próprio painel de Configurações.
    const ok = await new Promise((resolve) => {
      const bar = document.createElement('div');
      bar.className = 'user-row';
      bar.innerHTML = `<div class="grow"><b>Desativar ${escapeHTML(name)}?</b><small>A pessoa não conseguirá mais entrar no sistema.</small></div><button class="btn btn-ghost" type="button">Cancelar</button><button class="btn btn-danger" type="button">Desativar</button>`;
      panel.querySelector('.settings-bar').after(bar);
      const [cancel, confirmBtn] = bar.querySelectorAll('button');
      cancel.addEventListener('click', () => { bar.remove(); resolve(false); });
      confirmBtn.addEventListener('click', () => { bar.remove(); resolve(true); });
    });
    if (!ok) return;
  }
  try {
    await api(`/api/users/${id}/status`, { method: 'PATCH', data: { active: !active } });
    toast(`Usuário ${active ? 'desativado' : 'ativado'} com sucesso.`);
    loadUsers(panel);
  } catch (e) { toast(e.message, true); }
}
function newUserForm(panel) {
  const roles = Object.entries(roleNames).filter(([r]) => r !== 'GERENCIA' || state.user.role === 'GERENCIA');
  panel.innerHTML = `<div class="settings-title">Novo usuário</div><form class="settings-body" id="user-form" novalidate><div class="form-grid">
    ${box('u-name', 'Nome completo *', '<input id="u-name" name="name" maxlength="120" required />', true)}
    ${box('u-email', 'E-mail *', '<input id="u-email" name="email" type="email" maxlength="254" required />', true)}
    ${box('u-role', 'Cargo *', `<select id="u-role" name="role" required><option value="">Selecione</option>${roles.map(([r, l]) => `<option value="${r}">${l}</option>`).join('')}</select>`)}
    ${box('u-password', 'Senha provisória *', '<input id="u-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="Mínimo de 12 caracteres" required />')}
  </div><div id="user-error" class="form-error" role="alert"></div>
  <div class="modal-actions"><button class="btn btn-ghost" type="button" id="user-back">Voltar</button><button class="btn btn-primary" type="submit" id="save-user">Criar usuário</button></div></form>`;
  $('u-name').focus();
  $('user-back').addEventListener('click', () => loadUsers(panel));
  $('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = $('save-user'); submit.disabled = true;
    $('user-error').textContent = '';
    try {
      await api('/api/users', { method: 'POST', data: Object.fromEntries(new FormData(e.currentTarget).entries()) });
      toast('Usuário criado com sucesso.');
      loadUsers(panel);
    } catch (err) { $('user-error').textContent = err.message; submit.disabled = false; }
  });
}

// ---------- Eventos ----------
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.currentTarget.querySelector('[type=submit]'); button.disabled = true;
  $('login-error').textContent = '';
  const email = $('login-email').value.trim();
  try {
    const data = await api('/api/auth/login', { method: 'POST', data: { email, password: $('login-password').value } });
    if ($('remember-me').checked) rememberAccount(data.user.email);
    $('login-password').value = '';
    signedIn(data.user, data.csrf);
  } catch (err) { $('login-error').textContent = err.message; } finally { button.disabled = false; }
});
$('show-password').addEventListener('click', () => {
  const input = $('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
  $('show-password').innerHTML = svg(input.type === 'password' ? 'eye' : 'eyeOff');
  $('show-password').setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
});
$('forgot-password').addEventListener('click', () => toast('Peça à Gerência do estúdio para redefinir sua senha.'));
$('saved-accounts').addEventListener('click', () => {
  const list = $('saved-list');
  const accounts = store.get('plm_saved_accounts', []);
  list.innerHTML = accounts.length
    ? accounts.map((email) => `<button type="button" data-email="${escapeHTML(email)}"><span class="avatar sm">${escapeHTML(email[0].toUpperCase())}</span>${escapeHTML(email)}</button>`).join('')
    : '<p>Nenhuma conta salva neste navegador. Marque "Lembrar-me" ao entrar.</p>';
  list.classList.toggle('hidden');
  list.querySelectorAll('[data-email]').forEach((b) => b.addEventListener('click', () => {
    $('login-email').value = b.dataset.email; $('remember-me').checked = true;
    list.classList.add('hidden'); $('login-password').focus();
  }));
});
$('logout-btn').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { toast(e.message, true); }
  $('user-dropdown').classList.add('hidden');
  signOutLocally();
});
$('user-trigger').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('user-dropdown').classList.toggle('hidden') === false;
  $('user-trigger').setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) $('user-dropdown').classList.add('hidden');
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'toggle-theme') toggleTheme();
  if (action === 'privacy') privacyModal();
  if (action === 'open-settings') { $('user-dropdown').classList.add('hidden'); openSettings(actionEl.dataset.tab); }
});
document.querySelectorAll('.nav-item').forEach((el) => el.addEventListener('click', () => showPage(el.dataset.page, el.dataset.module)));
document.querySelectorAll('[data-goto]').forEach((el) => el.addEventListener('click', () => showPage(el.dataset.goto)));
$('new-patient').addEventListener('click', () => patientModal());
$('menu-toggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('collapse-sidebar').addEventListener('click', () => $('app-view').classList.toggle('collapsed'));
$('close-modal').addEventListener('click', closeModal);
$('modal-backdrop').addEventListener('click', (e) => { if (e.target === $('modal-backdrop')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('user-dropdown').classList.add('hidden'); } });
$('global-search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  state.search = e.target.value.trim(); state.pageNumber = 1; state.status = 'all';
  e.target.value = '';
  showPage('patients');
});
let debounceSearch;
$('patient-search').addEventListener('input', (e) => { clearTimeout(debounceSearch); debounceSearch = setTimeout(() => { state.search = e.target.value.trim(); state.pageNumber = 1; loadPatients(); }, 260); });
$('patient-filter').addEventListener('change', (e) => { state.status = e.target.value; state.pageNumber = 1; loadPatients(); });
$('prev-page').addEventListener('click', () => { if (state.pageNumber > 1) { state.pageNumber--; loadPatients(); } });
$('next-page').addEventListener('click', () => { if (state.pageNumber < state.pages) { state.pageNumber++; loadPatients(); } });
$('patient-rows').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]'); if (!btn) return;
  const p = state.patients.find((x) => x.id === btn.dataset.id); if (!p) return;
  if (btn.dataset.action === 'view') patientDetail(p.id);
  else if (btn.dataset.action === 'edit') patientModal(p);
  else if (btn.dataset.action === 'status') changePatientStatus(p);
});

async function init() {
  renderIcons();
  applyTheme(store.get('plm_theme', 'light'));
  const saved = store.get('plm_saved_accounts', []);
  if (saved[0]) { $('login-email').value = saved[0]; $('remember-me').checked = true; }
  try { const { user, csrf } = await api('/api/auth/me'); signedIn(user, csrf); }
  catch { signOutLocally(); }
}
init();
