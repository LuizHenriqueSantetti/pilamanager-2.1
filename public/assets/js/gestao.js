// Cobranças, Comissionamento e Financeiro — funcionam no navegador, como no original.
// Receber uma cobrança lança a receita no Financeiro; pagar uma comissão lança a despesa.
import {
  $, state, esc, svg, toast, openModal, closeModal, confirmDialog, box, options, newId, money, dateBR, isoDate,
  crumb, recarregar, canManage, allPatients, monthName, monthShort, lineChart, barChart, downloadCSV, renderIcons,
} from './nucleo.js';
import { dados, salvar, profissional, comissaoDoAgendamento, registrarHistorico } from './dados.js';

const situacaoCobranca = (c) => c.status === 'Recebido' ? 'Recebido' : (c.vencimento < isoDate() ? 'Vencido' : 'Pendente');
const badgeCobranca = (s) => `<span class="badge ${{ Recebido: 'active', Pendente: 'pending', Vencido: 'danger' }[s]}">${s}</span>`;

// ================= COBRANÇAS =================
const fCob = { busca: '', situacao: '' };
export async function renderCobrancas(el) {
  const db = dados();
  const nomes = Object.fromEntries((await allPatients()).map((p) => [p.id, p.name]));
  const total = db.cobrancas.reduce((a, c) => a + Number(c.valor), 0);
  const recebido = db.cobrancas.filter((c) => c.status === 'Recebido').reduce((a, c) => a + Number(c.valor), 0);
  el.innerHTML = `${crumb('Cobranças')}
    <div class="page-heading"><div><h1>Cobranças</h1><p>Cobranças geradas pelos planos dos pacientes. Recebimentos entram no Financeiro e nos relatórios.</p></div>
      <button class="btn btn-ghost" type="button" id="cob-csv">${svg('download')}Exportar</button></div>
    <div class="stats-grid three">
      <article class="stat-card"><span class="stat-icon" data-icon="wallet"></span><div><span>Total</span><strong>${money(total)}</strong></div></article>
      <article class="stat-card"><span class="stat-icon orange" data-icon="clock"></span><div><span>A receber</span><strong>${money(total - recebido)}</strong></div></article>
      <article class="stat-card"><span class="stat-icon green" data-icon="checkCircle"></span><div><span>Recebido</span><strong>${money(recebido)}</strong></div></article>
    </div>
    <div class="panel filters-panel"><div class="search-box"><span>${svg('search')}</span><input id="cob-busca" type="search" placeholder="Pesquisar registros" value="${esc(fCob.busca)}" aria-label="Pesquisar cobranças" /></div>
      <select id="cob-sit" aria-label="Situação"><option value="">Todas as situações</option>${options(['Pendente', 'Vencido', 'Recebido'], fCob.situacao)}</select></div>
    <div class="table-card"><table><thead><tr><th>Paciente / plano</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Ação</th></tr></thead><tbody id="cob-rows"></tbody></table></div>`;
  const lista = () => db.cobrancas.filter((c) => (!fCob.situacao || situacaoCobranca(c) === fCob.situacao)
    && (!fCob.busca || `${nomes[c.pacienteId] || c.pacienteNome} ${c.planoNome}`.toLowerCase().includes(fCob.busca.toLowerCase())))
    .sort((a, b) => (a.status === b.status ? b.vencimento.localeCompare(a.vencimento) : a.status === 'Pendente' ? -1 : 1));
  const desenhar = () => {
    const itens = lista();
    $('cob-rows').innerHTML = itens.length ? itens.map((c) => `<tr><td><b class="dark">${esc(nomes[c.pacienteId] || c.pacienteNome)}</b><small class="block muted">${esc(c.planoNome)}</small></td>
      <td>${dateBR(c.vencimento)}</td><td>${money(c.valor)}</td><td>${badgeCobranca(situacaoCobranca(c))}</td>
      <td>${c.status !== 'Recebido' && canManage() ? `<button class="btn btn-ghost small" type="button" data-receber="${c.id}">Receber</button>` : c.recebidoEm ? `<small class="muted">em ${dateBR(c.recebidoEm)}</small>` : ''}</td></tr>`).join('')
      : '<tr><td class="empty-row" colspan="5">Nenhuma cobrança encontrada.</td></tr>';
    $('cob-rows').querySelectorAll('[data-receber]').forEach((b) => b.addEventListener('click', () => receber(b.dataset.receber, nomes)));
  };
  $('cob-busca').addEventListener('input', (e) => { fCob.busca = e.target.value; desenhar(); });
  $('cob-sit').addEventListener('change', (e) => { fCob.situacao = e.target.value; desenhar(); });
  $('cob-csv').addEventListener('click', () => downloadCSV('cobrancas.csv', [['Paciente', 'Plano', 'Vencimento', 'Valor', 'Situação', 'Recebido em'],
    ...lista().map((c) => [nomes[c.pacienteId] || c.pacienteNome, c.planoNome, dateBR(c.vencimento), Number(c.valor).toFixed(2).replace('.', ','), situacaoCobranca(c), c.recebidoEm ? dateBR(c.recebidoEm) : ''])]));
  desenhar();
}

function receber(id, nomes) {
  const c = dados().cobrancas.find((x) => x.id === id); if (!c) return;
  const nome = nomes[c.pacienteId] || c.pacienteNome;
  openModal({ title: 'Registrar recebimento', subtitle: `${nome} · Plano ${c.planoNome}`, iconName: 'wallet', compact: true, html: `<form class="settings-body" id="rec-form"><div class="form-grid">
    ${box('rec-valor', 'Valor', `<input id="rec-valor" readonly value="${money(c.valor)}" />`)}
    ${box('rec-data', 'Data do recebimento *', `<input id="rec-data" type="date" required value="${isoDate()}" />`)}
    ${box('rec-forma', 'Forma de pagamento', `<select id="rec-forma">${options(['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência'], 'Pix')}</select>`, true)}</div>
    <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Confirmar recebimento</button></div></form>` });
  $('rec-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = $('rec-data').value; if (!data) return;
    c.status = 'Recebido'; c.recebidoEm = data; c.forma = $('rec-forma').value;
    dados().transacoes.push({ id: newId(), tipo: 'receita', data, descricao: `Plano ${c.planoNome} — ${nome}`, categoria: 'Planos', valor: Number(c.valor), cobrancaId: c.id });
    registrarHistorico(c.pacienteId, `Pagamento recebido`, `Plano ${c.planoNome} — ${money(c.valor)} (${c.forma})`, 'pagamentos', state.user.name);
    salvar(); closeModal(); toast('Recebimento registrado e lançado no Financeiro.'); recarregar();
  });
}

// ================= COMISSIONAMENTO =================
let mesComissao = isoDate().slice(0, 7);
export function calcularComissoes(mes) {
  const db = dados();
  return db.profissionais.map((p) => {
    const aulas = db.agendamentos.filter((a) => a.profissionalId === p.id && a.data.startsWith(mes) && (a.status === 'Realizado' || (a.status === 'Confirmado' && a.data < isoDate())));
    const valor = aulas.reduce((s, a) => s + comissaoDoAgendamento(a), 0);
    const pago = db.comissoesPagas.find((c) => c.profissionalId === p.id && c.mes === mes);
    return { p, aulas, valor: Math.round(valor * 100) / 100, pago };
  });
}
export async function renderComissoes(el) {
  const linhas = calcularComissoes(mesComissao);
  const meses = [...new Set(dados().agendamentos.map((a) => a.data.slice(0, 7)).concat(isoDate().slice(0, 7)))].sort().reverse();
  const total = linhas.reduce((s, l) => s + (l.pago ? l.pago.valor : l.valor), 0);
  const pago = linhas.filter((l) => l.pago).reduce((s, l) => s + l.pago.valor, 0);
  const [y, m] = mesComissao.split('-').map(Number);
  el.innerHTML = `${crumb('Comissionamento')}
    <div class="page-heading"><div><h1>Comissionamento</h1><p>Comissões calculadas pelas aulas realizadas de cada profissional — ${monthName(m - 1)} de ${y}.</p></div>
      <select id="com-mes" aria-label="Mês">${options(meses.map((x) => [x, `${monthName(Number(x.slice(5)) - 1)} de ${x.slice(0, 4)}`]), mesComissao)}</select></div>
    <div class="stats-grid three">
      <article class="stat-card"><span class="stat-icon" data-icon="dollar"></span><div><span>Total do mês</span><strong>${money(total)}</strong></div></article>
      <article class="stat-card"><span class="stat-icon orange" data-icon="clock"></span><div><span>A pagar</span><strong>${money(total - pago)}</strong></div></article>
      <article class="stat-card"><span class="stat-icon green" data-icon="checkCircle"></span><div><span>Pago</span><strong>${money(pago)}</strong></div></article>
    </div>
    <div class="table-card"><table><thead><tr><th>Profissional</th><th>Regra</th><th>Aulas realizadas</th><th>Comissão</th><th>Situação</th><th>Ação</th></tr></thead><tbody>
    ${linhas.map((l) => `<tr><td><div class="person"><span class="avatar sm sq">${esc(l.p.nome.split(' ').map((s) => s[0]).slice(0, 2).join(''))}</span><div><b>${esc(l.p.nome)}</b><small>${esc(l.p.tipo)}</small></div></div></td>
      <td>${l.p.tipoComissao === 'Percentual' ? `${l.p.comissao}% do valor da aula` : `${money(l.p.comissao)} por aula`}</td>
      <td><button class="link-btn" type="button" data-aulas="${l.p.id}">${l.aulas.length} aula(s)</button></td><td><b class="dark">${money(l.pago ? l.pago.valor : l.valor)}</b></td>
      <td>${l.pago ? `<span class="badge active">Pago em ${dateBR(l.pago.pagoEm)}</span>` : l.valor > 0 ? '<span class="badge pending">A pagar</span>' : '<span class="badge inactive">Sem aulas</span>'}</td>
      <td>${!l.pago && l.valor > 0 && canManage() ? `<button class="btn btn-ghost small" type="button" data-pagar="${l.p.id}">Pagar</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>`;
  $('com-mes').addEventListener('change', (e) => { mesComissao = e.target.value; renderComissoes(el).then(() => renderIcons(el)); });
  el.querySelectorAll('[data-aulas]').forEach((b) => b.addEventListener('click', () => {
    const l = linhas.find((x) => x.p.id === b.dataset.aulas);
    openModal({ title: `Aulas de ${l.p.nome}`, subtitle: `${monthName(m - 1)} de ${y}`, iconName: 'calendar', compact: true, html: `<div class="settings-body"><div class="soft-list scroll">${l.aulas.map((a) => `<div class="soft-item"><span class="time">${a.inicio}<small>${dateBR(a.data)}</small></span><div class="grow"><b>${esc(a.pacienteNome)}</b><small>${esc(a.sala)}</small></div><b>${money(comissaoDoAgendamento(a))}</b></div>`).join('') || '<p class="empty">Nenhuma aula realizada no mês.</p>'}</div>
      <div class="modal-actions"><button class="btn btn-primary" type="button" data-close>Fechar</button></div></div>` });
  }));
  el.querySelectorAll('[data-pagar]').forEach((b) => b.addEventListener('click', async () => {
    const l = linhas.find((x) => x.p.id === b.dataset.pagar);
    if (!(await confirmDialog('Pagar comissão', `Registrar o pagamento de ${money(l.valor)} para ${l.p.nome} (${l.aulas.length} aulas)? O valor entra como despesa no Financeiro.`, 'Pagar'))) return;
    const db = dados();
    db.comissoesPagas.push({ profissionalId: l.p.id, mes: mesComissao, valor: l.valor, pagoEm: isoDate() });
    db.transacoes.push({ id: newId(), tipo: 'despesa', data: isoDate(), descricao: `Comissão ${l.p.nome} — ${monthName(m - 1)}/${y}`, categoria: 'Comissões', valor: l.valor });
    salvar(); toast('Comissão paga e lançada no Financeiro.'); recarregar();
  }));
}

// ================= FINANCEIRO =================
let fFin = 'todos';
export function resumoAnual(ano) {
  const t = dados().transacoes.filter((x) => x.data.startsWith(String(ano)));
  const rec = Array(12).fill(0), desp = Array(12).fill(0);
  t.forEach((x) => { const m = Number(x.data.slice(5, 7)) - 1; (x.tipo === 'receita' ? rec : desp)[m] += Number(x.valor); });
  return { rec, desp, lucro: rec.map((r, i) => r - desp[i]) };
}
export async function renderFinanceiro(el) {
  const db = dados();
  const hoje = new Date(); const ano = hoje.getFullYear(); const mes = isoDate().slice(0, 7);
  const { rec, desp, lucro } = resumoAnual(ano);
  const recMes = rec[hoje.getMonth()], despMes = desp[hoje.getMonth()];
  const recAno = rec.reduce((a, b) => a + b, 0), lucroAno = lucro.reduce((a, b) => a + b, 0);
  const margem = recAno ? (lucroAno / recAno) * 100 : 0;
  const nomeMes = `${monthName(hoje.getMonth()).toLowerCase()} de ${ano}`;
  const card = (icone, cls, t, v, sub) => `<article class="stat-card"><span class="stat-icon ${cls}" data-icon="${icone}"></span><div><span>${t}</span><strong>${v}</strong><small>${sub}</small></div></article>`;
  el.innerHTML = `${crumb('Financeiro')}
    <div class="page-heading"><div><h1 class="h-sm">Financeiro</h1><p>Gestão financeira e fluxo de caixa — ${ano}</p></div>
      <div class="actions-row">${canManage() ? `<button class="btn btn-ghost" type="button" id="fin-nova">${svg('plus')}Nova transação</button>` : ''}<button class="btn btn-ghost" type="button" id="fin-csv">${svg('download')}Exportar</button></div></div>
    <div class="stats-grid">${card('trendUp', 'green', 'Receitas (Mês)', money(recMes), nomeMes)}${card('trendDown', 'red', 'Despesas (Mês)', money(despMes), nomeMes)}${card('dollar', '', 'Lucro Líquido (Ano)', money(lucroAno), `Total ${ano}`)}${card('trendUp', 'green', 'Margem de Lucro', `${margem.toFixed(1)}%`, 'Média anual')}</div>
    <div class="dash-grid even">
      <article class="panel"><header class="panel-head column-head"><h2>Receitas vs Despesas</h2><small>${ano}</small></header>${lineChart([{ values: rec, cls: 'green' }, { values: desp, cls: 'red' }], Array.from({ length: 12 }, (_, i) => monthShort(i)))}
        <div class="legend"><span class="green-text">● Receitas</span><span class="red-text">● Despesas</span></div></article>
      <article class="panel"><header class="panel-head column-head"><h2>Lucro Mensal</h2><small>Resultado líquido por mês em ${ano}</small></header>${barChart(lucro, Array.from({ length: 12 }, (_, i) => monthShort(i)))}</article>
    </div>
    <article class="panel no-pad"><header class="panel-head padded"><div><h2>Transações Recentes</h2><small id="fin-count"></small></div>
      <div class="seg">${[['todos', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']].map(([k, l]) => `<button type="button" data-fin="${k}" class="${fFin === k ? 'selected' : ''}">${l}</button>`).join('')}</div></header>
      <table><thead><tr><th>Tipo</th><th>Data</th><th>Descrição</th><th>Categoria</th><th class="right">Valor</th><th></th></tr></thead><tbody id="fin-rows"></tbody></table></article>`;
  const desenhar = () => {
    const itens = db.transacoes.filter((t) => fFin === 'todos' || t.tipo === fFin).sort((a, b) => b.data.localeCompare(a.data));
    $('fin-count').textContent = `${itens.length} lançamentos`;
    $('fin-rows').innerHTML = itens.length ? itens.slice(0, 100).map((t) => `<tr><td><span class="type-dot ${t.tipo === 'receita' ? 'green' : 'red'}">${svg(t.tipo === 'receita' ? 'arrowUpRight' : 'arrowDownRight')}</span></td>
      <td>${dateBR(t.data)}</td><td><b class="dark">${esc(t.descricao)}</b></td><td><span class="badge ${t.tipo === 'receita' ? 'active' : 'danger'}">${esc(t.categoria)}</span></td>
      <td class="right"><b class="${t.tipo === 'receita' ? 'green-text' : 'red-text'}">${t.tipo === 'receita' ? '+' : '−'} ${money(t.valor)}</b></td>
      <td>${!t.cobrancaId && canManage() ? `<div class="row-actions"><button type="button" class="del" data-del="${t.id}" title="Excluir" aria-label="Excluir lançamento">${svg('trash')}</button></div>` : ''}</td></tr>`).join('')
      : '<tr><td class="empty-row" colspan="6">Nenhum lançamento.</td></tr>';
    $('fin-rows').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmDialog('Excluir lançamento', 'Este lançamento será removido do Financeiro.', 'Excluir', true))) return;
      db.transacoes = db.transacoes.filter((t) => t.id !== b.dataset.del); salvar(); toast('Lançamento excluído.'); recarregar();
    }));
  };
  el.querySelectorAll('[data-fin]').forEach((b) => b.addEventListener('click', () => { fFin = b.dataset.fin; el.querySelectorAll('[data-fin]').forEach((x) => x.classList.toggle('selected', x === b)); desenhar(); }));
  $('fin-csv').addEventListener('click', () => downloadCSV(`financeiro-${ano}.csv`, [['Tipo', 'Data', 'Descrição', 'Categoria', 'Valor'],
    ...db.transacoes.sort((a, b) => a.data.localeCompare(b.data)).map((t) => [t.tipo === 'receita' ? 'Receita' : 'Despesa', dateBR(t.data), t.descricao, t.categoria, (t.tipo === 'receita' ? 1 : -1) * Number(t.valor)])]));
  $('fin-nova')?.addEventListener('click', novaTransacao);
  desenhar();
}

function novaTransacao() {
  openModal({ title: 'Nova transação', subtitle: 'Lance uma receita ou despesa no caixa.', iconName: 'dollar', compact: true, html: `<form class="settings-body" id="tr-form" novalidate><div class="form-grid">
    ${box('tr-tipo', 'Tipo *', `<select id="tr-tipo" name="tipo">${options([['despesa', 'Despesa'], ['receita', 'Receita']], 'despesa')}</select>`)}
    ${box('tr-data', 'Data *', `<input id="tr-data" name="data" type="date" required value="${isoDate()}" />`)}
    ${box('tr-desc', 'Descrição *', `<input id="tr-desc" name="descricao" required maxlength="120" placeholder="Ex: Manutenção dos aparelhos" />`, true)}
    ${box('tr-cat', 'Categoria *', `<select id="tr-cat" name="categoria">${options(['Aluguel', 'Contas', 'Material', 'Manutenção', 'Marketing', 'Salários', 'Impostos', 'Outros', 'Planos', 'Avulso'], 'Outros')}</select>`)}
    ${box('tr-valor', 'Valor (R$) *', `<input id="tr-valor" name="valor" type="number" min="0.01" step="0.01" required />`)}</div>
    <div id="tr-erro" class="form-error"></div>
    <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">Lançar</button></div></form>` });
  $('tr-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!f.descricao.trim() || !f.data || !(Number(f.valor) > 0)) { $('tr-erro').textContent = 'Preencha descrição, data e um valor maior que zero.'; return; }
    dados().transacoes.push({ id: newId(), tipo: f.tipo, data: f.data, descricao: f.descricao.trim(), categoria: f.categoria, valor: Number(f.valor) });
    salvar(); closeModal(); toast('Transação lançada.'); recarregar();
  });
}
