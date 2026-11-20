// Equipe (profissionais) — funciona no navegador, como no original.
import {
  $, esc, svg, toast, openModal, closeModal, confirmDialog, box, options, newId, isoDate, addDays, parseISO,
  dateBR, longDate, crumb, recarregar, maskCPF, maskPhone, initials, canManage, renderIcons,
} from './nucleo.js';
import { dados, salvar, profissional } from './dados.js';
import { statusAgenda } from './pacientes.js';

const filtros = { busca: '', tipo: '', situacao: '', vista: 'lista' };
const modalidades = ['Pilates', 'Solo', 'Aparelhos', 'Funcional', 'Alongamento', 'Reabilitação', 'Personal'];
const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const bancarioCompleto = (p) => Boolean((p.banco && p.agencia && p.conta) || p.chavePix);

export async function render(el) {
  const profs = dados().profissionais;
  const card = (t, v, cls = '') => `<div class="kpi"><small>${t}</small><b class="${cls}">${v}</b></div>`;
  el.innerHTML = `${crumb('Equipe')}
    <div class="list-heading"><div><h1>Profissionais</h1><p>Gerencie professores, fisioterapeutas, pagamentos e disponibilidade.</p></div>
      ${canManage() ? `<button class="btn btn-primary" type="button" id="novo-prof">${svg('plus')}Adicionar novo profissional</button>` : ''}</div>
    <div class="kpi-grid">${card('TOTAL', profs.length)}${card('ATIVOS', profs.filter((p) => p.situacao === 'Ativo').length, 'green')}${card('PROFESSORES', profs.filter((p) => p.tipo === 'Professor').length, 'orange')}${card('FISIOTERAPEUTAS', profs.filter((p) => p.tipo === 'Fisioterapeuta').length)}</div>
    <div class="panel filters-panel">
      <div class="search-box"><span>${svg('search')}</span><input id="eq-busca" type="search" placeholder="Buscar por nome, CPF, e-mail ou telefone" value="${esc(filtros.busca)}" aria-label="Buscar profissionais" /></div>
      <select id="eq-tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${options(['Fisioterapeuta', 'Professor'], filtros.tipo)}</select>
      <select id="eq-sit" aria-label="Situação"><option value="">Todas situações</option>${options(['Ativo', 'Inativo', 'Férias'], filtros.situacao)}</select>
      <button class="btn btn-ghost small" type="button" id="eq-limpar">Limpar filtros</button>
      <div class="seg icons">${[['lista', 'list'], ['grade', 'grid4']].map(([k, i]) => `<button type="button" data-vista="${k}" class="${filtros.vista === k ? 'selected' : ''}" aria-label="Ver em ${k}">${svg(i)}</button>`).join('')}</div>
    </div>
    <div id="eq-lista"></div>`;
  $('novo-prof')?.addEventListener('click', () => profissionalModal());
  let t;
  $('eq-busca').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { filtros.busca = e.target.value.trim(); desenhar(); }, 200); });
  $('eq-tipo').addEventListener('change', (e) => { filtros.tipo = e.target.value; desenhar(); });
  $('eq-sit').addEventListener('change', (e) => { filtros.situacao = e.target.value; desenhar(); });
  $('eq-limpar').addEventListener('click', () => { Object.assign(filtros, { busca: '', tipo: '', situacao: '' }); render(el).then(() => renderIcons(el)); });
  el.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => { filtros.vista = b.dataset.vista; render(el).then(() => renderIcons(el)); }));
  desenhar();
}

function desenhar() {
  const b = filtros.busca.toLowerCase(), bd = b.replace(/\D/g, '');
  const lista = dados().profissionais.filter((p) => (!filtros.tipo || p.tipo === filtros.tipo) && (!filtros.situacao || p.situacao === filtros.situacao)
    && (!b || p.nome.toLowerCase().includes(b) || p.email.toLowerCase().includes(b) || (bd && (p.cpf.includes(bd) || p.telefone.includes(bd)))));
  const acoes = (p) => `<div class="row-actions wrap"><button type="button" class="btn btn-soft small" data-acao="agenda" data-id="${p.id}">${svg('calendar')}Ver agenda</button>
    <button type="button" data-acao="ver" data-id="${p.id}" title="Ver" aria-label="Ver ${esc(p.nome)}">${svg('eye')}</button>
    ${canManage() ? `<button type="button" class="edit" data-acao="editar" data-id="${p.id}" title="Editar" aria-label="Editar ${esc(p.nome)}">${svg('pencil')}</button>
    <button type="button" class="power ${p.situacao === 'Ativo' ? '' : 'on'}" data-acao="status" data-id="${p.id}" title="${p.situacao === 'Ativo' ? 'Inativar' : 'Ativar'}" aria-label="Ativar ou inativar ${esc(p.nome)}">${svg('power')}</button>
    <button type="button" class="del" data-acao="excluir" data-id="${p.id}" title="Excluir" aria-label="Excluir ${esc(p.nome)}">${svg('trash')}</button>` : ''}</div>`;
  const situacao = (p) => `<span class="badge ${p.situacao === 'Ativo' ? 'active' : 'inactive'}">${esc(p.situacao)}</span><small class="${bancarioCompleto(p) ? 'green-text' : 'warn-text'}">Dados bancários ${bancarioCompleto(p) ? 'informados' : 'incompletos'}</small>`;
  $('eq-lista').innerHTML = (lista.length ? (filtros.vista === 'grade'
    ? `<div class="prof-grid">${lista.map((p) => `<article class="panel prof-card"><span class="avatar lg sq">${esc(initials(p.nome))}</span><b>${esc(p.nome)}</b><small>${esc(p.tipo)} · ${esc(p.registro)}</small><div class="stack">${situacao(p)}</div>${acoes(p)}</article>`).join('')}</div>`
    : lista.map((p) => `<article class="prof-row"><span class="avatar lg sq">${esc(initials(p.nome))}</span><div class="grow"><b>${esc(p.nome)}</b><small>${esc(p.tipo)} · ${esc(p.registro)}</small></div>
      <div class="contact"><small>${svg('mail')}${esc(p.email)}</small><small>${svg('phone')}${maskPhone(p.telefone)}</small></div><div class="stack">${situacao(p)}</div>${acoes(p)}</article>`).join(''))
    : '<div class="panel empty">Nenhum profissional encontrado.</div>')
    + `<div class="panel pager"><span>Exibindo ${lista.length} de ${dados().profissionais.length}</span></div>`;
  $('eq-lista').querySelectorAll('[data-acao]').forEach((btn) => btn.addEventListener('click', () => acao(btn.dataset.acao, btn.dataset.id)));
}

async function acao(tipo, id) {
  const p = profissional(id); if (!p) return;
  if (tipo === 'agenda') return agendaProfissional(p);
  if (tipo === 'ver') return verProfissional(id);
  if (tipo === 'editar') return profissionalModal(p);
  if (tipo === 'status') { p.situacao = p.situacao === 'Ativo' ? 'Inativo' : 'Ativo'; salvar(); toast(`Profissional ${p.situacao === 'Ativo' ? 'ativado' : 'inativado'}.`); return recarregar(); }
  if (tipo === 'excluir') {
    const aulas = dados().agendamentos.filter((a) => a.profissionalId === id && a.data >= isoDate() && a.status !== 'Cancelado').length;
    if (aulas) return toast(`${p.nome} tem ${aulas} aula(s) futura(s). Remarque ou cancele antes de excluir.`, true);
    if (!(await confirmDialog('Excluir profissional', `${p.nome} será removido(a) da equipe.`, 'Excluir', true))) return;
    dados().profissionais = dados().profissionais.filter((x) => x.id !== id); salvar();
    toast('Profissional excluído.'); recarregar();
  }
}

export function verProfissional(id) {
  const p = profissional(id); if (!p) return;
  const linhas = [['CPF', maskCPF(p.cpf)], ['RG', p.rg || '—'], ['Nascimento', dateBR(p.nascimento)], ['Telefone', maskPhone(p.telefone)], ['E-mail', p.email],
    ['Tipo', p.tipo], ['Registro', p.registro], ['Especialidade', p.especialidade], ['Admissão', dateBR(p.admissao)], ['Contrato', p.contrato], ['Situação', p.situacao],
    ['Duração da aula', `${p.duracao} minutos`], ['Modalidades', p.modalidades.join(', ') || '—'], ['Pagamento', p.metodoPagamento],
    ['Comissão', p.tipoComissao === 'Percentual' ? `${p.comissao}%` : `R$ ${p.comissao} por aula`], ['Endereço', [p.logradouro, p.numero, p.bairro, p.cidade, p.uf].filter(Boolean).join(', ') || '—'],
    ['Disponibilidade', p.turnos.map((t) => `${t.dia} ${t.inicio}–${t.fim}`).join('; ') || '—'], ['Observações', p.obs || '—']];
  openModal({ title: p.nome, subtitle: `${p.tipo} · ${p.registro}`, iconName: 'user', html: `<div class="modal-content"><dl class="detail-grid">${linhas.map(([k, v], i) => `<div class="${i >= 15 ? 'full' : ''}"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="modal-actions">${canManage() ? '<button class="btn btn-ghost" type="button" id="vp-editar">Editar</button>' : ''}<button class="btn btn-primary" type="button" data-close>Fechar</button></div></div>` });
  $('vp-editar')?.addEventListener('click', () => { closeModal(); profissionalModal(p); });
}

// ---------- Cadastro com 4 abas ----------
const repetidores = {
  turnos: { titulo: 'Disponibilidade', botao: 'Adicionar turno', campos: [['dia', 'select', dias], ['inicio', 'time'], ['fim', 'time']] },
  intervalos: { titulo: 'Intervalos', botao: 'Adicionar intervalo', campos: [['inicio', 'time'], ['fim', 'time']] },
  bloqueios: { titulo: 'Bloqueios de horário', botao: 'Adicionar bloqueio', campos: [['data', 'date'], ['inicio', 'time'], ['fim', 'time']] },
  ferias: { titulo: 'Férias ou afastamentos', botao: 'Adicionar período', campos: [['inicio', 'date'], ['fim', 'date']] },
};
function linhaRepetidor(tipo, item = {}) {
  return `<div class="rep-row" data-rep="${tipo}">${repetidores[tipo].campos.map(([k, t, ops]) => t === 'select'
    ? `<select data-k="${k}" aria-label="${k}">${options(ops, item[k])}</select>` : `<input type="${t}" data-k="${k}" value="${esc(item[k] || '')}" aria-label="${k}" />`).join('')}
    <button type="button" class="icon-btn ghost" data-remover aria-label="Remover">${svg('x')}</button></div>`;
}

export function profissionalModal(p = null) {
  const v = (k, d = '') => esc(p?.[k] ?? d);
  const abas = {
    pessoais: `<div class="foto-row"><span class="foto" id="pf-foto-prev">${p?.foto ? `<img src="${esc(p.foto)}" alt="" />` : svg('camera')}</span>
        <div><label class="btn btn-outline small file-btn">${svg('upload')}Selecionar Foto<input type="file" id="pf-foto" accept="image/png,image/jpeg" /></label><small class="muted">Máximo 2MB (JPG, PNG)</small></div></div>
      <div class="form-grid">
      ${box('pf-nome', 'Nome completo *', `<input id="pf-nome" name="nome" required maxlength="120" value="${v('nome')}" />`)}
      ${box('pf-cpf', 'CPF *', `<input id="pf-cpf" name="cpf" required inputmode="numeric" maxlength="14" value="${p ? maskCPF(p.cpf) : ''}" />`)}
      ${box('pf-rg', 'RG *', `<input id="pf-rg" name="rg" required maxlength="20" value="${v('rg')}" />`)}
      ${box('pf-nasc', 'Data de nascimento *', `<input id="pf-nasc" name="nascimento" type="date" required max="${isoDate()}" value="${v('nascimento')}" />`)}
      ${box('pf-tel', 'Telefone *', `<input id="pf-tel" name="telefone" required maxlength="16" value="${p ? maskPhone(p.telefone) : ''}" />`)}
      ${box('pf-email', 'E-mail *', `<input id="pf-email" name="email" type="email" required maxlength="254" value="${v('email')}" />`)}
      ${box('pf-cep', 'CEP', `<input id="pf-cep" name="cep" maxlength="9" value="${v('cep')}" />`)}
      ${box('pf-log', 'Logradouro', `<input id="pf-log" name="logradouro" value="${v('logradouro')}" />`)}
      ${box('pf-num', 'Número', `<input id="pf-num" name="numero" value="${v('numero')}" />`)}
      ${box('pf-comp', 'Complemento', `<input id="pf-comp" name="complemento" value="${v('complemento')}" />`)}
      ${box('pf-bairro', 'Bairro', `<input id="pf-bairro" name="bairro" value="${v('bairro')}" />`)}
      ${box('pf-cidade', 'Cidade', `<input id="pf-cidade" name="cidade" value="${v('cidade')}" />`)}
      ${box('pf-uf', 'UF', `<input id="pf-uf" name="uf" maxlength="2" value="${v('uf')}" />`)}
      ${box('pf-obs', 'Observações', `<textarea id="pf-obs" name="obs">${v('obs')}</textarea>`, true)}</div>`,
    profissionais: `<div class="form-grid">
      ${box('pf-tipo', 'Tipo de profissional *', `<select id="pf-tipo" name="tipo" required>${options(['Fisioterapeuta', 'Professor'], p?.tipo || 'Fisioterapeuta')}</select>`)}
      ${box('pf-reg', `<span id="pf-reg-label">${p?.tipo === 'Professor' ? 'CREF' : 'CREFITO'}</span> *`, `<input id="pf-reg" name="registro" required value="${v('registro')}" />`)}
      ${box('pf-esp', 'Especialidade *', `<input id="pf-esp" name="especialidade" required value="${v('especialidade')}" />`)}
      ${box('pf-adm', 'Data de admissão *', `<input id="pf-adm" name="admissao" type="date" required value="${v('admissao', isoDate())}" />`)}
      ${box('pf-sit', 'Situação', `<select id="pf-sit" name="situacao">${options(['Ativo', 'Inativo', 'Férias'], p?.situacao || 'Ativo')}</select>`)}
      ${box('pf-contrato', 'Contrato', `<select id="pf-contrato" name="contrato">${options(['PJ', 'CLT', 'Autônomo', 'Estágio'], p?.contrato || 'PJ')}</select>`)}
      </div>
      <p class="sub-title">Modalidades</p><div class="chip-row" id="pf-mods">${modalidades.map((m) => `<button type="button" class="chip ${p?.modalidades?.includes(m) ? 'selected' : ''}" data-mod="${m}">${m}</button>`).join('')}</div>
      ${['turnos'].map((k) => `<p class="sub-title">${repetidores[k].titulo}</p><div id="rep-${k}">${(p?.[k] || []).map((i) => linhaRepetidor(k, i)).join('')}</div><button type="button" class="btn btn-soft small" data-add="${k}">${repetidores[k].botao}</button>`).join('')}
      <div class="form-grid mt">${box('pf-dur', 'Duração padrão da aula (minutos) *', `<input id="pf-dur" name="duracao" type="number" min="15" max="180" required value="${v('duracao', 60)}" />`)}</div>
      ${['intervalos', 'bloqueios', 'ferias'].map((k) => `<p class="sub-title">${repetidores[k].titulo}</p><div id="rep-${k}">${(p?.[k] || []).map((i) => linhaRepetidor(k, i)).join('')}</div><button type="button" class="btn btn-soft small" data-add="${k}">${repetidores[k].botao}</button>`).join('')}`,
    pagamento: `<div class="form-grid">
      ${box('pf-met', 'Método de pagamento', `<select id="pf-met" name="metodoPagamento">${options(['Pix', 'Transferência', 'Dinheiro'], p?.metodoPagamento || 'Pix')}</select>`)}
      ${box('pf-tcom', 'Tipo de comissão', `<select id="pf-tcom" name="tipoComissao">${options(['Percentual', 'Fixo por aula'], p?.tipoComissao || 'Percentual')}</select>`)}
      ${box('pf-com', `<span id="pf-com-label">${p?.tipoComissao === 'Fixo por aula' ? 'Valor por aula (R$)' : 'Comissão percentual (%)'}</span> *`, `<input id="pf-com" name="comissao" type="number" min="0" step="0.01" required value="${v('comissao')}" />`)}
      ${box('pf-regras', 'Regras ou observações de pagamento', `<textarea id="pf-regras" name="regras">${v('regras')}</textarea>`, true)}</div>`,
    bancarios: `<p class="note">Os dados bancários são opcionais no primeiro cadastro.</p><div class="form-grid">
      ${box('pf-banco', 'Banco', `<input id="pf-banco" name="banco" value="${v('banco')}" />`)}${box('pf-cod', 'Código do banco', `<input id="pf-cod" name="codigoBanco" value="${v('codigoBanco')}" />`)}
      ${box('pf-ag', 'Agência', `<input id="pf-ag" name="agencia" value="${v('agencia')}" />`)}${box('pf-conta', 'Conta', `<input id="pf-conta" name="conta" value="${v('conta')}" />`)}
      ${box('pf-dig', 'Dígito da conta', `<input id="pf-dig" name="digito" value="${v('digito')}" />`)}${box('pf-tconta', 'Tipo de conta', `<select id="pf-tconta" name="tipoConta"><option value="">Selecione</option>${options(['Corrente', 'Poupança', 'Pagamento'], p?.tipoConta)}</select>`)}
      ${box('pf-tpix', 'Tipo da chave Pix', `<select id="pf-tpix" name="tipoPix"><option value="">Selecione</option>${options(['CPF', 'E-mail', 'Telefone', 'Aleatória'], p?.tipoPix)}</select>`)}${box('pf-pix', 'Chave Pix', `<input id="pf-pix" name="chavePix" value="${v('chavePix')}" />`)}
      ${box('pf-tit', 'Nome do titular', `<input id="pf-tit" name="titular" value="${v('titular')}" />`)}${box('pf-cpft', 'CPF do titular', `<input id="pf-cpft" name="cpfTitular" maxlength="14" value="${v('cpfTitular')}" />`)}</div>`,
  };
  const nomes = [['pessoais', 'Dados pessoais'], ['profissionais', 'Dados profissionais'], ['pagamento', 'Pagamento e comissão'], ['bancarios', 'Dados bancários']];
  openModal({ title: p ? 'Editar profissional' : 'Adicionar novo profissional', subtitle: 'Preencha os dados pessoais, profissionais e de pagamento.', iconName: 'user', size: 'wide', html: `
    <form id="prof-form" novalidate>
      <div class="tabs line full">${nomes.map(([k, l], i) => `<button type="button" data-tab="${k}" class="${i === 0 ? 'selected' : ''}">${l}</button>`).join('')}</div>
      ${nomes.map(([k], i) => `<div class="modal-content tab-pane ${i ? 'hidden' : ''}" data-pane="${k}">${abas[k]}</div>`).join('')}
      <div class="modal-footer column">
        <label class="consent"><input type="checkbox" id="pf-consent" ${p ? 'checked' : ''} /> Li e aceito a Política de Privacidade e autorizo o tratamento dos meus dados.</label>
        <div id="pf-erro" class="form-error" role="alert"></div>
        <div class="row-between"><small class="muted">* Campos obrigatórios</small><div class="actions-row"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${svg('check')}Salvar profissional</button></div></div>
      </div>
    </form>` });
  const form = $('prof-form');
  let foto = p?.foto || null;
  const mostrarAba = (k) => {
    form.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('selected', b.dataset.tab === k));
    form.querySelectorAll('[data-pane]').forEach((pane) => pane.classList.toggle('hidden', pane.dataset.pane !== k));
  };
  form.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => mostrarAba(b.dataset.tab)));
  form.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) $(`rep-${add.dataset.add}`).insertAdjacentHTML('beforeend', linhaRepetidor(add.dataset.add));
    if (e.target.closest('[data-remover]')) e.target.closest('.rep-row').remove();
    const mod = e.target.closest('[data-mod]'); if (mod) mod.classList.toggle('selected');
  });
  $('pf-cpf').addEventListener('input', (e) => { e.target.value = maskCPF(e.target.value); });
  $('pf-tel').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
  $('pf-tipo').addEventListener('change', (e) => { $('pf-reg-label').textContent = e.target.value === 'Professor' ? 'CREF' : 'CREFITO'; });
  $('pf-tcom').addEventListener('change', (e) => { $('pf-com-label').textContent = e.target.value === 'Fixo por aula' ? 'Valor por aula (R$)' : 'Comissão percentual (%)'; });
  $('pf-foto').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('A foto precisa ter no máximo 2MB.', true); return; }
    const r = new FileReader(); r.onload = () => { foto = r.result; $('pf-foto-prev').innerHTML = `<img src="${foto}" alt="" />`; }; r.readAsDataURL(file);
  });
  form.addEventListener('input', (e) => e.target.closest('.field-box')?.classList.remove('invalid'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const erro = $('pf-erro'); erro.textContent = '';
    form.querySelectorAll('.field-box.invalid').forEach((x) => x.classList.remove('invalid'));
    const faltando = [...form.querySelectorAll('[required]')].filter((x) => !String(x.value).trim());
    if (faltando.length) {
      faltando.forEach((x) => x.closest('.field-box')?.classList.add('invalid'));
      mostrarAba(faltando[0].closest('[data-pane]').dataset.pane);
      erro.textContent = 'Preencha os campos obrigatórios destacados.'; faltando[0].focus(); return;
    }
    const f = Object.fromEntries(new FormData(form).entries());
    f.cpf = f.cpf.replace(/\D/g, ''); f.telefone = f.telefone.replace(/\D/g, '');
    if (f.cpf.length !== 11) { mostrarAba('pessoais'); erro.textContent = 'CPF precisa ter 11 dígitos.'; return; }
    if (dados().profissionais.some((x) => x.cpf === f.cpf && x.id !== p?.id)) { mostrarAba('pessoais'); erro.textContent = 'Já existe um profissional com este CPF.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { mostrarAba('pessoais'); erro.textContent = 'E-mail inválido.'; return; }
    if (!$('pf-consent').checked) { erro.textContent = 'É preciso aceitar a Política de Privacidade.'; return; }
    const lerRep = (tipo) => [...form.querySelectorAll(`[data-rep="${tipo}"]`)].map((row) => Object.fromEntries([...row.querySelectorAll('[data-k]')].map((i) => [i.dataset.k, i.value])));
    const novo = { ...(p || {}), ...f, id: p?.id || newId(), duracao: Number(f.duracao), comissao: Number(f.comissao), foto,
      modalidades: [...form.querySelectorAll('[data-mod].selected')].map((b) => b.dataset.mod),
      turnos: lerRep('turnos'), intervalos: lerRep('intervalos'), bloqueios: lerRep('bloqueios'), ferias: lerRep('ferias') };
    if (p) Object.assign(p, novo); else dados().profissionais.push(novo);
    salvar(); closeModal(); toast(p ? 'Profissional atualizado.' : 'Profissional cadastrado com sucesso.'); recarregar();
  });
}

// ---------- Agenda do profissional ----------
function agendaProfissional(p) {
  const st = { modo: 'semana', ref: isoDate(), dia: '', cancelados: false };
  const desenharAgenda = () => {
    let inicio, fim;
    const d = parseISO(st.ref);
    if (st.modo === 'semana') { inicio = addDays(st.ref, -d.getDay()); fim = addDays(inicio, 6); }
    else { inicio = `${st.ref.slice(0, 7)}-01`; fim = addDays(isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1)), -1); }
    const doPeriodo = dados().agendamentos.filter((a) => a.profissionalId === p.id && a.data >= inicio && a.data <= fim);
    const visiveis = doPeriodo.filter((a) => (st.cancelados || a.status !== 'Cancelado') && (!st.dia || a.data === st.dia)).sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`));
    const diasPeriodo = []; for (let x = inicio; x <= fim; x = addDays(x, 1)) diasPeriodo.push(x);
    $('ap-corpo').innerHTML = `<div class="row-between wrap-gap"><div class="seg">${['semana', 'mês'].map((m) => `<button type="button" data-modo="${m}" class="${st.modo === m ? 'selected' : ''}">${m === 'semana' ? 'Semana' : 'Mês'}</button>`).join('')}</div>
      <div class="period-nav"><button class="icon-btn" type="button" data-nav="-1" aria-label="Anterior">${svg('chevronLeft')}</button><b>${dateBR(inicio)} a ${dateBR(fim)}</b><button class="icon-btn" type="button" data-nav="1" aria-label="Próximo">${svg('chevronRight')}</button><button class="btn btn-soft small" type="button" data-nav="0">Hoje</button></div></div>
      <small class="muted">Selecione um dia para filtrar as aulas. A consulta não altera os agendamentos.</small>
      <div class="kpi-grid three mt">${[['Aulas no período', doPeriodo.filter((a) => a.status !== 'Cancelado').length], ['Próximas no período', doPeriodo.filter((a) => a.data >= isoDate() && a.status !== 'Cancelado').length], ['Canceladas', doPeriodo.filter((a) => a.status === 'Cancelado').length]].map(([t, v]) => `<div class="kpi soft"><small>${t}</small><b>${v}</b></div>`).join('')}</div>
      <div class="day-strip ${st.modo === 'mês' ? 'month' : ''}">${diasPeriodo.map((x) => `<button type="button" data-dia="${x}" class="${x === st.dia ? 'selected' : ''} ${x === isoDate() ? 'today' : ''}"><small>${parseISO(x).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${parseISO(x).getDate()}</b><small>${doPeriodo.filter((a) => a.data === x && a.status !== 'Cancelado').length || '—'}</small></button>`).join('')}</div>
      <div class="row-between"><button class="btn btn-soft small" type="button" data-dia="">Todos os dias</button><label class="check"><input type="checkbox" id="ap-canc" ${st.cancelados ? 'checked' : ''} /> Incluir cancelados</label></div>
      <div class="soft-list mt">${visiveis.length ? visiveis.map((a) => `<div class="soft-item"><span class="time">${a.inicio}<small>${dateBR(a.data)}</small></span><div class="grow"><b>${esc(a.pacienteNome)}</b><small>${esc(a.sala)} · ${esc(a.tipo)}</small></div>${statusAgenda(a.status)}</div>`).join('') : `<div class="empty center">${svg('calendar')}<b>Nenhuma aula neste período</b><p>Confira outro dia ou use as setas para mudar o período.</p></div>`}</div>`;
    $('ap-corpo').querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { st.modo = b.dataset.modo; st.dia = ''; desenharAgenda(); }));
    $('ap-corpo').querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.nav); st.dia = '';
      if (!n) st.ref = isoDate(); else if (st.modo === 'semana') st.ref = addDays(st.ref, 7 * n);
      else { const x = parseISO(st.ref); st.ref = isoDate(new Date(x.getFullYear(), x.getMonth() + n, 1)); }
      desenharAgenda();
    }));
    $('ap-corpo').querySelectorAll('[data-dia]').forEach((b) => b.addEventListener('click', () => { st.dia = b.dataset.dia; desenharAgenda(); }));
    $('ap-canc').addEventListener('change', (e) => { st.cancelados = e.target.checked; desenharAgenda(); });
  };
  openModal({ title: 'Agenda do profissional', subtitle: p.nome, iconName: 'calendar', size: 'wide', html: `<div class="modal-content" id="ap-corpo"></div>
    <div class="modal-footer"><small class="muted">Consulta integrada à agenda do estúdio</small><button class="btn btn-soft right-auto-l" type="button" data-close>Fechar</button></div>` });
  desenharAgenda();
}
export { longDate };
