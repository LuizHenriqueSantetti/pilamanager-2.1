// Agendamento — funciona no navegador, como no original. Os pacientes vêm do banco.
import {
  $, state, esc, svg, toast, openModal, closeModal, confirmDialog, box, options, checkRequired, newId,
  isoDate, addDays, parseISO, longDate, dateBR, crumb, recarregar, allPatients, minutes, hhmm, renderIcons,
} from './nucleo.js';
import { dados, salvar, profissional, registrarHistorico } from './dados.js';
import { statusAgenda } from './pacientes.js';

const filtros = { vista: 'lista', profissional: '', status: '', inicio: '', semana: isoDate() };
const tipos = ['Regular', 'Experimental', 'Reposição', 'Avaliação'];
const horarios = Array.from({ length: 27 }, (_, i) => hhmm(7 * 60 + i * 30));
const corStatus = { Confirmado: 'ok', Realizado: 'done', Pendente: 'pending', Cancelado: 'danger', Falta: 'danger' };

export async function render(el) {
  const db = dados();
  const pacientes = await allPatients();
  const nomes = Object.fromEntries(pacientes.map((p) => [p.id, p.name]));
  const total = db.agendamentos.length;
  const confirmados = db.agendamentos.filter((a) => a.status === 'Confirmado').length;
  const pend = db.agendamentos.filter((a) => a.status === 'Pendente').length;
  el.innerHTML = `${crumb('Agendamento')}
    <div class="list-heading"><div><h1 class="h-sm">Agendamento</h1><p>Gerencie a agenda do estúdio</p></div>
      <button class="btn btn-primary" type="button" id="novo-ag">${svg('plus')}Novo Agendamento</button></div>
    <div class="mini-stats"><div class="mini-stat"><b>${total}</b>Total</div><div class="mini-stat"><b class="green">${confirmados}</b>Confirmados</div><div class="mini-stat"><b class="orange">${pend}</b>Pendentes</div></div>
    <div class="toolbar">
      <div class="seg">${[['lista', 'list', 'Lista'], ['semana', 'calendar', 'Semana']].map(([k, i, l]) => `<button type="button" data-vista="${k}" class="${filtros.vista === k ? 'selected' : ''}">${svg(i)}${l}</button>`).join('')}</div>
      <button class="btn btn-ghost small" type="button" id="toggle-filtros">${svg('filter')}Filtros</button>
    </div>
    <div class="panel filters-panel ${filtros.profissional || filtros.status || filtros.inicio ? '' : 'hidden'}" id="filtros-ag">
      <select id="f-ag-prof" aria-label="Profissional"><option value="">Todos os profissionais</option>${options(db.profissionais.map((p) => [p.id, p.nome]), filtros.profissional)}</select>
      <select id="f-ag-status" aria-label="Situação"><option value="">Todas as situações</option>${options(Object.keys(corStatus), filtros.status)}</select>
      <label class="inline">A partir de <input type="date" id="f-ag-inicio" value="${filtros.inicio}" /></label>
      <button class="btn btn-ghost small" type="button" id="limpar-ag">Limpar filtros</button>
    </div>
    <div id="agenda-conteudo"></div>`;
  $('novo-ag').addEventListener('click', () => agendamentoModal());
  el.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => { filtros.vista = b.dataset.vista; render(el).then(() => renderIcons(el)); }));
  $('toggle-filtros').addEventListener('click', () => $('filtros-ag').classList.toggle('hidden'));
  const aplicar = () => { filtros.profissional = $('f-ag-prof').value; filtros.status = $('f-ag-status').value; filtros.inicio = $('f-ag-inicio').value; desenhar(nomes); };
  ['f-ag-prof', 'f-ag-status', 'f-ag-inicio'].forEach((id) => $(id).addEventListener('change', aplicar));
  $('limpar-ag').addEventListener('click', () => { Object.assign(filtros, { profissional: '', status: '', inicio: '' }); render(el).then(() => renderIcons(el)); });
  desenhar(nomes);
}

function filtrados() {
  return dados().agendamentos.filter((a) => (!filtros.profissional || a.profissionalId === filtros.profissional)
    && (!filtros.status || a.status === filtros.status) && (!filtros.inicio || a.data >= filtros.inicio));
}

function cartao(a, nomes) {
  const prof = profissional(a.profissionalId);
  const nome = nomes[a.pacienteId] || a.pacienteNome;
  const alunos = dados().agendamentos.filter((x) => x.data === a.data && x.inicio === a.inicio && x.sala === a.sala && x.status !== 'Cancelado').length;
  return `<button type="button" class="ag-card" data-ag="${a.id}"><span class="ag-time"><b>${a.inicio}</b><small>${a.fim}</small></span><span class="ag-bar ${corStatus[a.status]}"></span>
    <span class="avatar sm">${esc(nome[0] || '?')}</span><span class="grow"><b>${esc(nome)}</b><small>${esc(prof?.nome || '—')} · ${esc(a.sala)} · este horário possui ${alunos} aluno(s)</small></span>${statusAgenda(a.status)}</button>`;
}

function desenhar(nomes) {
  const alvo = $('agenda-conteudo');
  const ags = filtrados().sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`));
  if (filtros.vista === 'semana') {
    const d = parseISO(filtros.semana); const inicio = addDays(filtros.semana, -d.getDay());
    const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
    alvo.innerHTML = `<div class="week-nav"><button class="icon-btn" type="button" id="sem-ant" aria-label="Semana anterior">${svg('chevronLeft')}</button>
      <b>${dateBR(dias[0])} a ${dateBR(dias[6])}</b><button class="icon-btn" type="button" id="sem-prox" aria-label="Próxima semana">${svg('chevronRight')}</button><button class="btn btn-ghost small" type="button" id="sem-hoje">Hoje</button></div>
      <div class="week-grid">${dias.map((dia) => `<div class="week-col ${dia === isoDate() ? 'today' : ''}"><div class="week-head"><small>${parseISO(dia).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${parseISO(dia).getDate()}</b></div>
        ${ags.filter((a) => a.data === dia).map((a) => `<button type="button" class="week-chip ${corStatus[a.status]}" data-ag="${a.id}"><b>${a.inicio}</b>${esc(nomes[a.pacienteId] || a.pacienteNome)}</button>`).join('') || '<small class="muted center">—</small>'}</div>`).join('')}</div>`;
    $('sem-ant').addEventListener('click', () => { filtros.semana = addDays(filtros.semana, -7); desenhar(nomes); });
    $('sem-prox').addEventListener('click', () => { filtros.semana = addDays(filtros.semana, 7); desenhar(nomes); });
    $('sem-hoje').addEventListener('click', () => { filtros.semana = isoDate(); desenhar(nomes); });
  } else {
    const porDia = {};
    ags.forEach((a) => { (porDia[a.data] ||= []).push(a); });
    const diasOrdem = Object.keys(porDia);
    alvo.innerHTML = diasOrdem.length ? diasOrdem.map((dia) => `<section class="day-group"><header>${svg('calendar')}<b>${longDate(dia)}</b><span class="badge plan">${porDia[dia].length} aula${porDia[dia].length > 1 ? 's' : ''}</span></header>
      <div class="day-list">${porDia[dia].map((a) => cartao(a, nomes)).join('')}</div></section>`).join('') : '<div class="panel empty">Nenhum agendamento encontrado.</div>';
  }
  alvo.querySelectorAll('[data-ag]').forEach((b) => b.addEventListener('click', () => gerenciar(b.dataset.ag, nomes)));
}

function gerenciar(id, nomes) {
  const a = dados().agendamentos.find((x) => x.id === id); if (!a) return;
  const nome = nomes[a.pacienteId] || a.pacienteNome;
  openModal({ title: nome, subtitle: `${longDate(a.data)} · ${a.inicio} às ${a.fim}`, iconName: 'calendar', compact: true, html: `<div class="settings-body">
    <dl class="detail-grid">${[['Profissional', profissional(a.profissionalId)?.nome || '—'], ['Sala', a.sala], ['Tipo de aula', a.tipo], ['Situação', a.status]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <p class="sub-title">Alterar situação</p>
    <div class="chip-row">${['Confirmado', 'Pendente', 'Realizado', 'Falta', 'Cancelado'].map((s) => `<button type="button" class="chip ${a.status === s ? 'selected' : ''}" data-status="${s}">${s}</button>`).join('')}</div>
    <div class="modal-actions"><button class="btn btn-danger-soft right-auto" type="button" id="ag-excluir">Excluir</button><button class="btn btn-ghost" type="button" id="ag-editar">Editar</button><button class="btn btn-primary" type="button" data-close>Fechar</button></div></div>` });
  $('modal-body').querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => {
    a.status = b.dataset.status; salvar();
    registrarHistorico(a.pacienteId, a.status.toLowerCase(), `${longDate(a.data)} ${a.inicio} - ${profissional(a.profissionalId)?.nome || ''}`, 'agendamentos', state.user.name);
    closeModal(); toast(`Agendamento marcado como ${a.status}.`); recarregar();
  }));
  $('ag-editar').addEventListener('click', () => { closeModal(); agendamentoModal(a); });
  $('ag-excluir').addEventListener('click', async () => {
    closeModal();
    if (!(await confirmDialog('Excluir agendamento', `O agendamento de ${nome} em ${dateBR(a.data)} às ${a.inicio} será excluído.`, 'Excluir', true))) return;
    dados().agendamentos = dados().agendamentos.filter((x) => x.id !== a.id); salvar();
    toast('Agendamento excluído.'); recarregar();
  });
}

export async function agendamentoModal(a = null, padrao = {}) {
  const db = dados();
  const pacientes = (await allPatients()).filter((p) => p.active || p.id === a?.pacienteId);
  const profs = db.profissionais.filter((p) => p.situacao === 'Ativo' || p.id === a?.profissionalId);
  const val = { ...padrao, ...(a || {}) };
  openModal({ title: a ? 'Editar Agendamento' : 'Novo Agendamento', subtitle: 'Preencha as informações do agendamento.', iconName: 'calendar', html: `
    <form id="ag-form" class="modal-content" novalidate><div class="form-grid">
      ${box('ag-paciente', 'Paciente *', `<select id="ag-paciente" name="pacienteId"><option value="">Selecione ou digite abaixo</option>${options(pacientes.map((p) => [p.id, p.name]), val.pacienteId)}</select><input id="ag-paciente-nome" name="pacienteNome" class="mt-s" placeholder="Ou digite o nome do paciente" value="${val.pacienteId ? '' : esc(val.pacienteNome || '')}" />`, true)}
      ${box('ag-prof', 'Profissional *', `<select id="ag-prof" name="profissionalId" required><option value="">Selecione</option>${options(profs.map((p) => [p.id, p.nome]), val.profissionalId)}</select>`)}
      ${box('ag-sala', 'Sala *', `<select id="ag-sala" name="sala" required><option value="">Selecione</option>${options(db.salas, val.sala)}</select>`)}
      ${box('ag-data', 'Data *', `<input id="ag-data" name="data" type="date" required value="${esc(val.data || '')}" />`)}
      ${box('ag-tipo', 'Tipo de Aula', `<select id="ag-tipo" name="tipo">${options(tipos, val.tipo || 'Regular')}</select>`)}
      ${box('ag-inicio', 'Horário *', `<select id="ag-inicio" name="inicio" required><option value="">Selecione</option>${options(horarios, val.inicio)}</select>`)}
      ${box('ag-fim', 'Término', `<input id="ag-fim" name="fim" type="time" value="${esc(val.fim || '')}" />`)}
    </div><div id="ag-erro" class="form-error" role="alert"></div>
    <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${a ? 'Salvar Agendamento' : 'Criar Agendamento'}</button></div></form>` });
  const calcularFim = () => {
    const prof = profissional($('ag-prof').value);
    if ($('ag-inicio').value) $('ag-fim').value = hhmm(minutes($('ag-inicio').value) + Number(prof?.duracao || 60));
  };
  $('ag-inicio').addEventListener('change', calcularFim);
  $('ag-prof').addEventListener('change', calcularFim);
  $('ag-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const erro = $('ag-erro');
    if (!checkRequired(e.currentTarget, erro)) return;
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const paciente = pacientes.find((p) => p.id === f.pacienteId);
    const nome = paciente?.name || f.pacienteNome.trim();
    if (!nome) { erro.textContent = 'Selecione o paciente ou digite o nome.'; $('ag-paciente').closest('.field-box').classList.add('invalid'); return; }
    if (!f.fim) f.fim = hhmm(minutes(f.inicio) + 60);
    if (minutes(f.fim) <= minutes(f.inicio)) { erro.textContent = 'O término precisa ser depois do horário de início.'; return; }
    // Turma no mesmo horário é permitida (pilates em grupo); horários sobrepostos diferentes, não.
    const doDia = db.agendamentos.filter((x) => x.id !== a?.id && x.data === f.data && x.status !== 'Cancelado');
    const choca = doDia.find((x) => x.profissionalId === f.profissionalId && x.inicio !== f.inicio
      && minutes(x.inicio) < minutes(f.fim) && minutes(f.inicio) < minutes(x.fim));
    if (choca) { erro.textContent = `O profissional já tem aula das ${choca.inicio} às ${choca.fim} nesse dia.`; return; }
    if (doDia.some((x) => x.inicio === f.inicio && (paciente ? x.pacienteId === paciente.id : x.pacienteNome === nome))) {
      erro.textContent = 'Esse paciente já está agendado nesse horário.'; return;
    }
    const novo = { id: a?.id || newId(), pacienteId: paciente?.id || null, pacienteNome: nome, profissionalId: f.profissionalId, sala: f.sala, data: f.data, inicio: f.inicio, fim: f.fim, tipo: f.tipo, status: a?.status || 'Pendente' };
    if (a) Object.assign(a, novo); else db.agendamentos.push(novo);
    salvar();
    if (paciente) registrarHistorico(paciente.id, a ? 'Agendamento alterado' : 'Agendamento criado', `${dateBR(f.data)} ${f.inicio} - ${profissional(f.profissionalId)?.nome}`, 'agendamentos', state.user.name);
    closeModal(); toast(a ? 'Agendamento atualizado.' : 'Agendamento criado com sucesso.'); recarregar();
  });
}
