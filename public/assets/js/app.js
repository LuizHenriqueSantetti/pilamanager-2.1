// Entrada do sistema: login, menu, busca do topo e Visão Geral.
import {
  $, state, roleNames, svg, renderIcons, esc, storage, toast, api, allPatients, clearPatientCache,
  openModal, closeModal, initials, money, isoDate, dayMonth, monthName, parseISO, crumb,
} from './nucleo.js';
import { dados, garantirDados, profissional } from './dados.js';
import * as pacientes from './pacientes.js';
import * as agenda from './agenda.js';
import * as equipe from './equipe.js';
import * as planos from './planos.js';
import * as gestao from './gestao.js';
import * as relatorios from './relatorios.js';
import { openSettings } from './configuracoes.js';
import { initAcessibilidade } from './acessibilidade.js';

const paginas = {
  dashboard: renderDashboard,
  agenda: agenda.render,
  pacientes: pacientes.render,
  equipe: equipe.render,
  planos: planos.render,
  cobrancas: gestao.renderCobrancas,
  comissoes: gestao.renderComissoes,
  financeiro: gestao.renderFinanceiro,
  relatorios: relatorios.render,
};
const titulos = { dashboard: 'Visão Geral', agenda: 'Agendamento', pacientes: 'Pacientes', equipe: 'Equipe', planos: 'Planos', cobrancas: 'Cobranças', comissoes: 'Comissionamento', financeiro: 'Financeiro', relatorios: 'Relatórios' };
let paginaAtual = 'dashboard';

// ---------- Tema ----------
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-action="toggle-theme"]').forEach((b) => { b.innerHTML = svg(theme === 'dark' ? 'sun' : 'moon'); });
  storage.set('plm_theme', theme);
}
const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

function privacyModal() {
  openModal({ title: 'Política de Privacidade', iconName: 'shield', html: `<div class="modal-content privacy-text">
    <p>O PilaManager guarda somente as informações necessárias para o atendimento no estúdio.</p>
    <h3>Quais dados são guardados</h3><p>Dados cadastrais dos pacientes (nome, CPF, nascimento, contato), informações de acompanhamento informadas no cadastro, agenda, planos e pagamentos, além das contas de acesso da equipe.</p>
    <h3>Como são protegidos</h3><p>O acesso exige login, com permissões por cargo. As senhas são guardadas criptografadas e as sessões expiram automaticamente.</p>
    <h3>Consentimento</h3><p>O cadastro registra a data em que o consentimento para o tratamento dos dados foi aceito. O paciente pode pedir a correção ou a exclusão dos seus dados à Gerência.</p>
    <div class="modal-actions"><button class="btn btn-primary" type="button" data-close>Entendi</button></div></div>` });
}

// ---------- Sessão ----------
function signOutLocally() {
  state.user = null; state.csrf = null;
  clearPatientCache();
  closeModal();
  $('login-view').classList.remove('hidden');
  $('app-view').classList.add('hidden');
  $('login-password').value = '';
}
state.onSignOut = signOutLocally;

export function atualizarUsuario() {
  const u = state.user;
  $('user-name').textContent = u.name;
  $('user-role').textContent = roleNames[u.role] || u.role;
  const foto = dados()?.perfil?.foto;
  $('user-initials').innerHTML = foto ? `<img src="${esc(foto)}" alt="" />` : esc(initials(u.name));
}
export function atualizarClinica() {
  const c = dados().clinica;
  $('workspace-name').textContent = c.nomeSistema || 'PilaManager';
  $('workspace-desc').textContent = c.descricao || '';
  $('brand-name').textContent = c.nomeSistema || 'PilaManager';
  $('workspace-logo').innerHTML = c.logo ? `<img src="${esc(c.logo)}" alt="" />` : svg('building');
}
const permitido = (pagina) => state.user.role === 'GERENCIA' || dados().cargos[state.user.role]?.[pagina] !== false;
export function aplicarPermissoes() {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('hidden', !permitido(b.dataset.page)));
}

async function signedIn(user, csrf) {
  state.user = user; state.csrf = csrf;
  $('login-view').classList.add('hidden');
  $('app-view').classList.remove('hidden');
  $('login-error').textContent = '';
  try { garantirDados(await allPatients(true)); } catch (e) { toast(e.message, true); garantirDados([]); }
  atualizarUsuario();
  atualizarClinica();
  aplicarPermissoes();
  showPage('dashboard');
}
function rememberAccount(email) {
  const accounts = storage.get('plm_saved_accounts', []).filter((e) => e !== email);
  storage.set('plm_saved_accounts', [email, ...accounts].slice(0, 5));
}

// ---------- Navegação ----------
export async function showPage(page) {
  if (!paginas[page]) page = 'dashboard';
  paginaAtual = page;
  // Esconde e limpa as outras telas (evita conteúdo antigo e ids repetidos escondidos na página).
  document.querySelectorAll('.page').forEach((el) => { el.classList.add('hidden'); if (el.id !== 'page-sem-acesso') el.innerHTML = ''; });
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('selected', b.dataset.page === page));
  $('sidebar').classList.remove('open');
  window.scrollTo(0, 0);
  if (!permitido(page)) { $('page-sem-acesso').classList.remove('hidden'); return; }
  const el = $(`page-${page}`);
  el.classList.remove('hidden');
  try { await paginas[page](el); } catch (e) { toast(e.message, true); }
  renderIcons(el);
}
window.addEventListener('pm:ir', (e) => showPage(e.detail));
window.addEventListener('pm:recarregar', () => showPage(paginaAtual));
window.addEventListener('pm:perfil', () => atualizarUsuario());
window.addEventListener('pm:clinica', () => atualizarClinica());
window.addEventListener('pm:tema', (e) => applyTheme(e.detail));
window.addEventListener('pm:permissoes', () => aplicarPermissoes());

// ---------- Visão Geral ----------
async function renderDashboard(el) {
  const db = dados();
  const hoje = isoDate();
  const mes = hoje.slice(0, 7);
  const s = await api('/api/patients/summary');
  const ativos = (await allPatients()).filter((p) => p.active);
  const atendimentosHoje = db.agendamentos.filter((a) => a.data === hoje && a.status !== 'Cancelado').length;
  const receitaMes = db.transacoes.filter((t) => t.tipo === 'receita' && t.data.startsWith(mes)).reduce((a, t) => a + Number(t.valor), 0);
  const pendentes = db.cobrancas.filter((c) => c.status === 'Pendente').length;
  const agora = `${hoje} ${new Date().toTimeString().slice(0, 5)}`;
  const proximos = db.agendamentos.filter((a) => `${a.data} ${a.inicio}` >= agora && a.status !== 'Cancelado')
    .sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`)).slice(0, 5);
  const nomes = Object.fromEntries(ativos.map((p) => [p.id, p.name]));
  const vencidas = db.cobrancas.filter((c) => c.status === 'Pendente' && c.vencimento < hoje)
    .map((c) => ({ ...c, dias: Math.round((parseISO(hoje) - parseISO(c.vencimento)) / 86400000) })).sort((a, b) => b.dias - a.dias).slice(0, 5);
  const semEmail = ativos.filter((p) => !p.email).length;
  const card = (icone, cls, titulo, valor, sub) => `<article class="stat-card"><span class="stat-icon ${cls}" data-icon="${icone}"></span><div><span>${titulo}</span><strong>${valor}</strong><small>${sub}</small></div></article>`;
  el.innerHTML = `${crumb('Visão Geral')}
    <div class="page-heading"><div><h1>Visão Geral</h1><p>O que precisa da sua atenção, em um só lugar.</p></div><span class="date-chip">${new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span></div>
    <div class="stats-grid">
      ${card('users', '', 'Pacientes Ativos', s.active, 'Registros do estúdio')}
      ${card('calendar', 'green', 'Atendimentos Hoje', atendimentosHoje, 'Agenda do dia')}
      ${card('dollar', '', 'Receita do Mês', money(receitaMes).replace(',00', ''), 'Pagamentos recebidos')}
      ${card('card', 'orange', 'Cobranças Pendentes', pendentes, 'Acompanhar recebimentos')}
    </div>
    <div class="section-labels"><span>AGENDA &amp; ACOMPANHAMENTO</span><span>ROTINA DO ESTÚDIO</span></div>
    <div class="dash-grid">
      <article class="panel"><header class="panel-head"><h2>Próximos Agendamentos</h2><button class="icon-btn ghost" type="button" data-goto="agenda" aria-label="Abrir agenda">${svg('clock')}</button></header>
        <div class="soft-list">${proximos.length ? proximos.map((a) => `<div class="soft-item"><span class="time">${a.inicio}<small>${dayMonth(a.data)}</small></span><div class="grow"><b>${esc(nomes[a.pacienteId] || a.pacienteNome)}</b><small>${esc(profissional(a.profissionalId)?.nome || '—')}</small></div></div>`).join('') : '<p class="empty">Nenhum agendamento futuro.</p>'}</div></article>
      <article class="panel"><header class="panel-head"><h2><span class="warn">${svg('alert')}</span>Alertas Inteligentes</h2></header>
        <div class="soft-list">${vencidas.map((c) => `<div class="soft-item column"><b class="danger-text">Plano vencido</b><small>${esc(nomes[c.pacienteId] || c.pacienteNome)} está com plano vencido há ${c.dias} dia(s).</small></div>`).join('')}
        ${semEmail ? `<div class="soft-item column"><b class="warn-text">Cadastro incompleto</b><small>${semEmail} paciente(s) sem e-mail cadastrado.</small></div>` : ''}
        ${!vencidas.length && !semEmail ? '<p class="empty">Nenhum alerta no momento.</p>' : ''}</div></article>
    </div>
    <div class="dash-grid even">
      <article class="panel"><header class="panel-head"><h2><span class="tile orange">${svg('cake')}</span>Aniversariantes de ${monthName(new Date().getMonth())}</h2></header>
        <div class="soft-list">${s.birthdaysThisMonth.length ? s.birthdaysThisMonth.map((p) => `<div class="soft-item"><span class="day-badge orange">${svg('cake')}</span><div class="grow"><b>${esc(p.name)}</b><small>Dia ${p.day} · ${p.turning} anos</small></div></div>`).join('') : '<p class="empty">Nenhum aniversariante neste mês.</p>'}</div></article>
      <article class="panel"><header class="panel-head"><h2><span class="tile">${svg('cake')}</span>Próximos Aniversários</h2></header>
        <div class="soft-list">${s.upcomingBirthdays.length ? s.upcomingBirthdays.map((p) => `<button type="button" class="soft-item clickable" data-paciente="${p.id}"><span class="day-badge">${p.daysUntil === 0 ? 'hoje' : p.daysUntil + 'd'}</span><div class="grow"><b>${esc(p.name)}</b><small>${dayMonth(p.next)}</small></div>${svg('chevronRight')}</button>`).join('') : '<p class="empty">Cadastre a data de nascimento para ver aniversários.</p>'}</div></article>
    </div>`;
  el.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.goto)));
  el.querySelectorAll('[data-paciente]').forEach((b) => b.addEventListener('click', () => pacientes.abrirFicha(b.dataset.paciente)));
}

// ---------- Busca do topo (pacientes e profissionais) ----------
async function buscaGlobal(termo) {
  const box = $('search-results');
  const t = termo.trim().toLowerCase();
  if (t.length < 2) { box.classList.add('hidden'); return; }
  const lista = (await allPatients()).filter((p) => p.name.toLowerCase().includes(t) || (p.email || '').toLowerCase().includes(t)).slice(0, 5);
  const profs = dados().profissionais.filter((p) => p.nome.toLowerCase().includes(t)).slice(0, 3);
  box.innerHTML = (lista.length || profs.length)
    ? lista.map((p) => `<button type="button" data-tipo="paciente" data-id="${p.id}"><span class="avatar sm">${esc(p.name[0])}</span><span><b>${esc(p.name)}</b><small>Paciente</small></span></button>`).join('')
      + profs.map((p) => `<button type="button" data-tipo="profissional" data-id="${p.id}"><span class="avatar sm alt">${esc(initials(p.nome))}</span><span><b>${esc(p.nome)}</b><small>${esc(p.tipo)}</small></span></button>`).join('')
    : '<p>Nenhum resultado.</p>';
  box.classList.remove('hidden');
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    box.classList.add('hidden'); $('global-search').value = '';
    if (b.dataset.tipo === 'paciente') pacientes.abrirFicha(b.dataset.id);
    else { showPage('equipe').then(() => equipe.verProfissional(b.dataset.id)); }
  }));
}

// ---------- Eventos ----------
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = e.currentTarget.querySelector('[type=submit]'); button.disabled = true;
  $('login-error').textContent = '';
  try {
    const data = await api('/api/auth/login', { method: 'POST', data: { email: $('login-email').value.trim(), password: $('login-password').value } });
    if ($('remember-me').checked) rememberAccount(data.user.email);
    $('login-password').value = '';
    await signedIn(data.user, data.csrf);
  } catch (err) { $('login-error').textContent = err.message; } finally { button.disabled = false; }
});
$('show-password').addEventListener('click', () => {
  const input = $('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
  $('show-password').innerHTML = svg(input.type === 'password' ? 'eye' : 'eyeOff');
});
$('forgot-password').addEventListener('click', () => toast('Peça à Gerência do estúdio para redefinir sua senha.'));
$('saved-accounts').addEventListener('click', () => {
  const list = $('saved-list');
  const accounts = storage.get('plm_saved_accounts', []);
  list.innerHTML = accounts.length
    ? accounts.map((email) => `<button type="button" data-email="${esc(email)}"><span class="avatar sm">${esc(email[0].toUpperCase())}</span>${esc(email)}</button>`).join('')
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
  if (!e.target.closest('.topbar-search')) $('search-results').classList.add('hidden');
  if (e.target.closest('[data-close]')) closeModal();
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === 'toggle-theme') toggleTheme();
  if (action === 'privacy') privacyModal();
  if (action === 'open-settings') { $('user-dropdown').classList.add('hidden'); openSettings(actionEl.dataset.tab); }
});
document.querySelectorAll('.nav-item').forEach((el) => el.addEventListener('click', () => showPage(el.dataset.page)));
$('menu-toggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('collapse-sidebar').addEventListener('click', () => $('app-view').classList.toggle('collapsed'));
$('close-modal').addEventListener('click', closeModal);
$('modal-backdrop').addEventListener('click', (e) => { if (e.target === $('modal-backdrop')) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); $('user-dropdown').classList.add('hidden'); $('search-results').classList.add('hidden'); } });
let debounce;
$('global-search').addEventListener('input', (e) => { clearTimeout(debounce); debounce = setTimeout(() => buscaGlobal(e.target.value).catch(() => {}), 200); });

async function init() {
  renderIcons();
  applyTheme(storage.get('plm_theme', 'light'));
  initAcessibilidade(applyTheme);
  const saved = storage.get('plm_saved_accounts', []);
  if (saved[0]) { $('login-email').value = saved[0]; $('remember-me').checked = true; }
  try { const { user, csrf } = await api('/api/auth/me'); await signedIn(user, csrf); }
  catch { signOutLocally(); }
}
init();
