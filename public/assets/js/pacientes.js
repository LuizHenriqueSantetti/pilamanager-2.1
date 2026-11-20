// Pacientes — gravados no PostgreSQL (API /api/patients).
// O plano do paciente, a agenda e os pagamentos vêm dos dados locais, como no original.
import {
  $, state, esc, svg, api, toast, openModal, closeModal, confirmDialog, box, options, checkRequired,
  maskCPF, maskPhone, ageFrom, dateBR, dateTimeBR, money, crumb, canEditPatients, canManage,
  allPatients, clearPatientCache, recarregar, printArea, isoDate,
} from './nucleo.js';
import { dados, salvar, planoDoPaciente, definirPlano, profissional, registrarHistorico } from './dados.js';

const lista = { page: 1, pages: 1, status: 'all', plano: '', search: '', items: [] };
const camposTexto = [
  ['special_notes', 'Notas Especiais (ex: preferências de horário, observações importantes)', 'Ex: Prefere não conversar durante sessão, disponível apenas manhãs, etc.'],
  ['disabilities', 'Deficiências', 'Descreva se há alguma deficiência...'],
  ['health_problems', 'Problemas de Saúde', 'Descreva problemas de saúde relevantes...'],
  ['pain_limitations', 'Dores e Limitações', 'Descreva dores ou limitações físicas...'],
  ['clinical_notes', 'Queixas e Observações', 'Outras queixas ou observações importantes...'],
  ['goals', 'Objetivos', 'O que o paciente busca alcançar...'],
];

export async function render(el) {
  const planos = dados().planos;
  el.innerHTML = `${crumb('Pacientes')}
    <div class="list-heading">
      <div><h1 class="h-sm">Pacientes</h1><p id="patient-counts">—</p></div>
      <div class="actions-row"><button class="btn btn-ghost small" type="button" id="patients-pdf">${svg('download')}PDF</button>
      ${canEditPatients() ? `<button id="new-patient" class="btn btn-primary" type="button">${svg('plus')}Novo Paciente</button>` : ''}</div>
    </div>
    <div class="filters-row">
      <div class="search-box"><span>${svg('search')}</span><input id="patient-search" aria-label="Buscar pacientes" type="search" placeholder="Buscar por nome, e-mail ou CPF..." value="${esc(lista.search)}" /></div>
      <select id="patient-plan" aria-label="Plano"><option value="">Todos os planos</option>${options(planos.map((p) => [p.id, p.nome]), lista.plano)}<option value="sem" ${lista.plano === 'sem' ? 'selected' : ''}>Sem plano</option></select>
      <select id="patient-filter" aria-label="Situação do paciente">${options([['all', 'Todos os status'], ['active', 'Ativos'], ['inactive', 'Inativos']], lista.status)}</select>
      <span class="results" id="patient-total">—</span>
    </div>
    <div class="table-card" id="patients-table">
      <table><thead><tr><th>Paciente</th><th class="col-age">Idade</th><th class="col-cpf">Plano</th><th class="col-date">Cadastro</th><th class="col-status">Status</th><th class="right">Ações</th></tr></thead>
      <tbody id="patient-rows"><tr><td class="empty-row" colspan="6">Carregando pacientes...</td></tr></tbody></table>
    </div>
    <div class="pagination hidden" id="pagination"><button id="prev-page" type="button" class="btn btn-ghost">Anterior</button><span id="page-label">1 / 1</span><button id="next-page" type="button" class="btn btn-ghost">Próxima</button></div>`;
  $('new-patient')?.addEventListener('click', () => patientModal());
  $('patients-pdf').addEventListener('click', () => printArea($('patients-table')));
  let debounce;
  $('patient-search').addEventListener('input', (e) => { clearTimeout(debounce); debounce = setTimeout(() => { lista.search = e.target.value.trim(); lista.page = 1; carregar(); }, 260); });
  $('patient-filter').addEventListener('change', (e) => { lista.status = e.target.value; lista.page = 1; carregar(); });
  $('patient-plan').addEventListener('change', (e) => { lista.plano = e.target.value; lista.page = 1; carregar(); });
  $('prev-page').addEventListener('click', () => { if (lista.page > 1) { lista.page--; carregar(); } });
  $('next-page').addEventListener('click', () => { if (lista.page < lista.pages) { lista.page++; carregar(); } });
  $('patient-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    const p = lista.items.find((x) => x.id === btn.dataset.id); if (!p) return;
    if (btn.dataset.action === 'view') abrirFicha(p.id);
    else if (btn.dataset.action === 'edit') patientModal(p);
    else if (btn.dataset.action === 'status') alternarStatus(p);
  });
  await carregar();
}

async function carregar() {
  const rows = $('patient-rows');
  try {
    // Com filtro de plano a lista completa é buscada e filtrada aqui (o plano fica nos dados locais).
    const porPlano = Boolean(lista.plano);
    const qs = new URLSearchParams({ page: porPlano ? '1' : String(lista.page), per_page: porPlano ? '500' : '20', status: lista.status, search: lista.search });
    const [data, summary] = await Promise.all([api(`/api/patients?${qs}`), api('/api/patients/summary')]);
    let items = data.items;
    if (porPlano) items = items.filter((p) => (lista.plano === 'sem' ? !planoDoPaciente(p.id) : dados().vinculos[p.id] === lista.plano));
    lista.items = items; lista.pages = porPlano ? 1 : data.pages;
    $('patient-counts').textContent = `${summary.active} ativos · ${summary.total} total`;
    const total = porPlano ? items.length : data.total;
    $('patient-total').textContent = `${total} resultado${total === 1 ? '' : 's'}`;
    $('pagination').classList.toggle('hidden', lista.pages <= 1);
    $('page-label').textContent = `${data.page} / ${lista.pages}`;
    $('prev-page').disabled = lista.page <= 1;
    $('next-page').disabled = lista.page >= lista.pages;
    if (!items.length) { rows.innerHTML = '<tr><td class="empty-row" colspan="6">Nenhum paciente encontrado.</td></tr>'; return; }
    rows.innerHTML = items.map((p) => {
      const plano = planoDoPaciente(p.id);
      const status = `<span class="badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span>`;
      return `<tr>
      <td><div class="person"><span class="avatar sm">${esc(p.name.trim()[0]?.toUpperCase() || '?')}</span><div><b>${esc(p.name)}</b><small>${esc(p.email || 'sem e-mail')}</small><span class="mobile-only">${status}</span></div></div></td>
      <td class="col-age">${p.age != null ? `${p.age} anos` : '—'}</td>
      <td class="col-cpf">${plano ? `<span class="badge plan">${esc(plano.nome)}</span>` : '<span class="muted">Sem plano</span>'}</td>
      <td class="col-date">${dateBR(p.created_at)}</td>
      <td class="col-status">${status}</td>
      <td class="right"><div class="row-actions">
        <button type="button" data-action="view" data-id="${p.id}" title="Ver ficha" aria-label="Ver ficha de ${esc(p.name)}">${svg('eye')}</button>
        ${canEditPatients() ? `<button type="button" class="edit" data-action="edit" data-id="${p.id}" title="Editar" aria-label="Editar ${esc(p.name)}">${svg('pencil')}</button>
        <button type="button" class="power ${p.active ? '' : 'on'}" data-action="status" data-id="${p.id}" title="${p.active ? 'Inativar' : 'Reativar'}" aria-label="${p.active ? 'Inativar' : 'Reativar'} ${esc(p.name)}">${svg('power')}</button>` : ''}
      </div></td></tr>`;
    }).join('');
  } catch (e) {
    rows.innerHTML = '<tr><td class="empty-row" colspan="6">Não foi possível carregar os pacientes.</td></tr>';
    toast(e.message, true);
  }
}

// ---------- Formulário (Novo / Editar) ----------
export function patientModal(patient = null) {
  if (!canEditPatients()) return toast('Você não tem permissão para alterar pacientes.', true);
  const editing = Boolean(patient);
  const v = (key) => esc(patient?.[key] ?? '');
  const planoAtual = patient ? dados().vinculos[patient.id] || '' : '';
  const planosAtivos = dados().planos.filter((p) => p.ativo || p.id === planoAtual);
  openModal({ title: editing ? 'Editar Paciente' : 'Novo Paciente', iconName: 'file', html: `
    <form id="patient-form" class="modal-content" novalidate>
      <div class="form-grid">
        ${box('f-name', 'Nome Completo *', `<input id="f-name" name="name" placeholder="Nome do paciente" maxlength="150" required value="${v('name')}" />`)}
        ${box('f-age', 'Idade *', `<input id="f-age" placeholder="0" readonly value="${ageFrom(patient?.birth_date) || ''}" title="Calculada pela data de nascimento" />`)}
        ${box('f-cpf', 'CPF *', `<input id="f-cpf" name="cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14" required value="${patient?.cpf ? maskCPF(patient.cpf) : ''}" />`)}
        ${box('f-birth', 'Data de Nascimento *', `<input id="f-birth" name="birth_date" type="date" required max="${isoDate()}" value="${v('birth_date')}" />`)}
        ${box('f-email', 'Email *', `<input id="f-email" name="email" type="email" placeholder="email@exemplo.com" maxlength="254" required value="${v('email')}" />`)}
        ${box('f-phone', 'Telefone', `<input id="f-phone" name="phone" type="tel" placeholder="(00) 00000-0000" maxlength="16" value="${patient?.phone ? maskPhone(patient.phone) : ''}" />`)}
        ${box('f-plan-search', 'Plano', `<input id="f-plan-search" placeholder="Pesquisar plano..." class="mb" /><select id="f-plan"><option value="">Cadastrar sem plano</option>${options(planosAtivos.map((p) => [p.id, `${p.nome} — ${money(p.preco)} (${p.aulas} aulas)`]), planoAtual)}</select>`, true)}
        ${camposTexto.map(([key, label, ph]) => box(`f-${key}`, label, `<textarea id="f-${key}" name="${key}" placeholder="${ph}" maxlength="2000">${v(key)}</textarea>`, true)).join('')}
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
  $('f-plan-search').addEventListener('input', (e) => {
    const t = e.target.value.toLowerCase();
    [...$('f-plan').options].forEach((o) => { o.hidden = Boolean(o.value) && !o.textContent.toLowerCase().includes(t); });
  });
  const form = $('patient-form');
  form.addEventListener('input', (e) => e.target.closest('.field-box')?.classList.remove('invalid'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkRequired(form, $('modal-error'))) return;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (!editing) payload.privacy_consent = $('f-consent').checked;
    const planoId = $('f-plan').value;
    const submit = $('save-patient'); submit.disabled = true;
    $('modal-error').textContent = '';
    try {
      const res = await api(editing ? `/api/patients/${patient.id}` : '/api/patients', { method: editing ? 'PATCH' : 'POST', data: payload });
      const id = editing ? patient.id : res.id;
      definirPlano({ id, name: payload.name }, planoId);
      registrarHistorico(id, editing ? 'Editou paciente' : 'Criou paciente', 'Alteração registrada no cadastro', 'alteracoes', state.user.name);
      clearPatientCache();
      closeModal();
      toast(editing ? 'Paciente atualizado com sucesso.' : 'Paciente cadastrado com sucesso.');
      if (!editing) Object.assign(lista, { page: 1, search: '', status: 'all', plano: '' });
      recarregar();
    } catch (e) {
      $('modal-error').textContent = e.message;
      $('modal-error').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } finally { submit.disabled = false; }
  });
}

async function alternarStatus(p) {
  const action = p.active ? 'Inativar' : 'Reativar';
  const msg = p.active
    ? `${p.name} deixará de aparecer entre os pacientes ativos. O cadastro continua salvo e pode ser reativado depois.`
    : `${p.name} voltará a aparecer entre os pacientes ativos.`;
  if (!(await confirmDialog(`${action} paciente`, msg, action, p.active))) return false;
  try {
    await api(`/api/patients/${p.id}/status`, { method: 'PATCH', data: { active: !p.active } });
    registrarHistorico(p.id, p.active ? 'Paciente inativado' : 'Paciente reativado', 'Situação alterada', 'alteracoes', state.user.name);
    clearPatientCache();
    toast(`Paciente ${p.active ? 'inativado' : 'reativado'} com sucesso.`);
    recarregar();
    return true;
  } catch (e) { toast(e.message, true); return false; }
}

// ---------- Ficha com abas ----------
export async function abrirFicha(id, aba = 'dados') {
  let p;
  try { ({ patient: p } = await api(`/api/patients/${id}`)); } catch (e) { return toast(e.message, true); }
  const db = dados();
  const plano = planoDoPaciente(p.id);
  const ags = db.agendamentos.filter((a) => a.pacienteId === p.id).sort((a, b) => `${b.data}${b.inicio}`.localeCompare(`${a.data}${a.inicio}`));
  const cobs = db.cobrancas.filter((c) => c.pacienteId === p.id).sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  const item = (k, val, full = false) => `<div class="${full ? 'full' : ''}"><dt>${esc(k)}</dt><dd>${val}</dd></div>`;
  const abas = {
    dados: `<dl class="detail-grid">${item('Nome completo', esc(p.name), true)}${item('CPF', p.cpf ? maskCPF(p.cpf) : '—')}${item('E-mail', esc(p.email || '—'))}
      ${item('Telefone', p.phone ? maskPhone(p.phone) : '—')}${item('Data de Nascimento', dateBR(p.birth_date))}${item('Idade', p.age != null ? `${p.age} anos` : '—')}${item('Data de Cadastro', dateBR(p.created_at))}
      ${item('Status', `<span class="badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span>`)}${item('Plano', esc(plano?.nome || 'Sem plano'))}
      ${item('Objetivos', esc(p.goals || '—'), true)}${item('Observações de Saúde', esc(p.health_problems || '—'), true)}</dl>`,
    plano: plano ? `<div class="soft-item column"><b>${esc(plano.nome)} <span class="badge active">${plano.ativo ? 'Ativo' : 'Inativo'}</span></b><small>${esc(plano.descricao)}</small></div>
      <dl class="detail-grid mt">${item('Investimento', `${money(plano.preco)} / ${plano.duracao.toLowerCase()}`)}${item('Aulas', `${plano.aulas} aulas`)}${item('Benefícios', plano.beneficios.map((b) => `<span class="badge plan">${esc(b)}</span>`).join(' ') || '—', true)}</dl>`
      : '<p class="empty">Paciente sem plano. Use Editar para vincular um plano.</p>',
    agenda: ags.length ? `<div class="soft-list">${ags.map((a) => `<div class="soft-item"><span class="time">${a.inicio}<small>${dateBR(a.data)}</small></span><div class="grow"><b>${esc(profissional(a.profissionalId)?.nome || '—')}</b><small>${esc(a.sala)} · ${esc(a.tipo)}</small></div>${statusAgenda(a.status)}</div>`).join('')}</div>` : '<p class="empty">Nenhuma aula agendada.</p>',
    pagamentos: cobs.length ? `<div class="soft-list">${cobs.map((c) => `<div class="soft-item"><div class="grow"><b>Plano ${esc(c.planoNome)}</b><small>Vencimento ${dateBR(c.vencimento)}</small></div><b class="money">${money(c.valor)}</b><span class="badge ${c.status === 'Recebido' ? 'active' : 'pending'}">${c.status === 'Recebido' ? 'Pago' : 'Pendente'}</span></div>`).join('')}</div>` : '<p class="empty">Nenhuma cobrança.</p>',
    avaliacoes: `<h3 class="sub-title">Avaliações</h3><dl class="detail-grid">${camposTexto.map(([k, label]) => item(label.replace(/ \(.*\)$/, ''), esc(p[k] || '—'), true)).join('')}</dl>`,
  };
  const nomesAbas = [['dados', 'Dados'], ['plano', 'Plano'], ['agenda', 'Agenda'], ['pagamentos', 'Pagamentos'], ['avaliacoes', 'Avaliações']];
  openModal({ title: p.name, subtitle: [p.email, p.phone ? maskPhone(p.phone) : ''].filter(Boolean).join(' · '), iconName: 'user', size: 'ficha', html: `
    <div class="ficha" id="ficha">
      <div class="tabs line">${nomesAbas.map(([k, l]) => `<button type="button" data-aba="${k}" class="${k === aba ? 'selected' : ''}">${l}</button>`).join('')}</div>
      <div class="modal-content" id="ficha-aba">${abas[aba]}</div>
      <div class="modal-content historico">
        <div class="hist-head"><b>${svg('history')}Histórico do paciente</b><select id="hist-filtro" aria-label="Filtrar histórico">${options([['todos', 'todos'], ['agendamentos', 'agendamentos'], ['alteracoes', 'alterações'], ['planos', 'planos'], ['pagamentos', 'pagamentos']], 'todos')}</select></div>
        <div class="soft-list scroll" id="hist-lista"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" type="button" id="ficha-pdf">${svg('download')}Exportar PDF</button>
      ${canEditPatients() ? `<button class="btn btn-ghost" type="button" id="ficha-editar">Editar</button>
      <button class="btn btn-warn" type="button" id="ficha-status">${p.active ? 'Indisponível' : 'Disponível'}</button>` : ''}
      ${canManage() ? '<button class="btn btn-danger-soft right-auto" type="button" id="ficha-excluir">Excluir</button>' : ''}
    </div>` });
  const historico = [
    ...db.historico.filter((h) => h.pacienteId === p.id).map((h) => ({ ...h, quando: h.quando })),
    ...ags.slice(0, 20).map((a) => ({ titulo: a.status.toLowerCase(), detalhe: `${new Date(`${a.data}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long' })} ${a.inicio} - ${profissional(a.profissionalId)?.nome || ''}`, tag: 'agendamentos', autor: profissional(a.profissionalId)?.nome || '', quando: `${a.data}T${a.inicio}` })),
    ...cobs.map((c) => ({ titulo: `Plano ${c.planoNome}`, detalhe: `${money(c.valor)} — ${c.status}`, tag: 'pagamentos', autor: '', quando: `${c.recebidoEm || c.vencimento}T00:00` })),
  ].sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
  const desenharHistorico = (filtro) => {
    const itens = historico.filter((h) => filtro === 'todos' || h.tag === filtro);
    $('hist-lista').innerHTML = itens.length ? itens.map((h) => `<div class="soft-item column"><div class="row-between"><b>${esc(h.titulo)}</b><span class="badge plan">${esc(h.tag)}</span></div><small>${esc(h.detalhe)}</small><small class="muted">${esc(h.autor ? h.autor + ' - ' : '')}${dateTimeBR(h.quando)}</small></div>`).join('') : '<p class="empty">Nada registrado.</p>';
  };
  desenharHistorico('todos');
  $('hist-filtro').addEventListener('change', (e) => desenharHistorico(e.target.value));
  $('modal-body').querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => {
    $('modal-body').querySelectorAll('[data-aba]').forEach((x) => x.classList.toggle('selected', x === b));
    $('ficha-aba').innerHTML = abas[b.dataset.aba];
  }));
  $('ficha-pdf').addEventListener('click', () => printArea($('modal')));
  $('ficha-editar')?.addEventListener('click', () => { closeModal(); patientModal(p); });
  $('ficha-status')?.addEventListener('click', async () => { closeModal(); await alternarStatus(p); });
  $('ficha-excluir')?.addEventListener('click', async () => {
    closeModal();
    if (!(await confirmDialog('Excluir paciente', `${p.name} será excluído(a) definitivamente do banco de dados. Essa ação não pode ser desfeita.`, 'Excluir', true))) return;
    try {
      await api(`/api/patients/${p.id}`, { method: 'DELETE' });
      delete dados().vinculos[p.id]; salvar();
      clearPatientCache();
      toast('Paciente excluído.');
      recarregar();
    } catch (e) { toast(e.message, true); }
  });
}

export const statusAgenda = (s) => {
  const cls = { Confirmado: 'active', Realizado: 'done', Pendente: 'pending', Cancelado: 'danger', Falta: 'danger' }[s] || 'inactive';
  return `<span class="badge ${cls}">${esc(s)}</span>`;
};
export { allPatients };
