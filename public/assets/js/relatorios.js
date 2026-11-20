// Relatórios — juntam pacientes (banco) com agenda, planos e financeiro (navegador).
import { $, esc, svg, money, dateBR, isoDate, crumb, allPatients, monthShort, barChart, hBarChart, printArea, maskPhone, renderIcons } from './nucleo.js';
import { dados, profissional, planoDoPaciente, comissaoDoAgendamento } from './dados.js';
import { statusAgenda } from './pacientes.js';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const st = { aba: 'geral', inicio: `${new Date().getFullYear()}-01-01`, fim: isoDate() };

export async function render(el) {
  const db = dados();
  const pacientes = await allPatients();
  const dentro = (d) => d >= st.inicio && d <= st.fim;
  const ags = db.agendamentos.filter((a) => dentro(a.data));
  const trans = db.transacoes.filter((t) => dentro(t.data));
  const receitas = trans.filter((t) => t.tipo === 'receita'), despesas = trans.filter((t) => t.tipo === 'despesa');
  const soma = (l) => l.reduce((a, t) => a + Number(t.valor), 0);
  const faltas = ags.filter((a) => a.status === 'Falta');
  const nomes = Object.fromEntries(pacientes.map((p) => [p.id, p.name]));
  const abas = [
    ['geral', 'bars', 'Geral', 'Resumo'], ['pacientes', 'users', 'Pacientes', `${pacientes.length} registros`], ['agendamentos', 'calendar', 'Agendamentos', `${ags.length} aulas`],
    ['faltas', 'xCircle', 'Faltas', `${faltas.length} faltas`], ['comissoes', 'award', 'Comissões', `${db.profissionais.length} profissionais`],
    ['receitas', 'trendUp', 'Receitas', money(soma(receitas))], ['despesas', 'dollar', 'Despesas', money(soma(despesas))], ['planos', 'card', 'Planos', `${db.planos.length} planos`],
  ];
  const kpis = (lista) => `<div class="kpi-grid">${lista.map(([t, v, sub, cls]) => `<div class="kpi soft"><small>${t}</small><b class="${cls || ''}">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`).join('')}</div>`;
  const tabela = (cab, linhas) => `<div class="table-card mt"><table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.length ? linhas.join('') : `<tr><td class="empty-row" colspan="${cab.length}">Nenhum registro no período.</td></tr>`}</tbody></table></div>`;
  const meses6 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); return [d.getFullYear(), d.getMonth()]; });
  const porMes = (lista) => meses6.map(([y, m]) => soma(lista.filter((t) => t.data.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`))));
  const ativos = pacientes.filter((p) => p.active);
  const realizadas = ags.filter((a) => a.status === 'Realizado');
  const naoCanceladas = ags.filter((a) => a.status !== 'Cancelado');

  const conteudo = {
    geral: () => `${kpis([['Total de Alunos', pacientes.length, `↑ ${pacientes.filter((p) => dentro(p.created_at.slice(0, 10))).length} novos`],
      ['Taxa de Retenção', `${pacientes.length ? Math.round((ativos.length / pacientes.length) * 100) : 0}%`, 'Pacientes ativos', 'green'],
      ['Receita Total', money(soma(receitas)), `${money(soma(receitas) / Math.max(1, new Set(receitas.map((t) => t.data.slice(0, 7))).size))}/mês`],
      ['Lucro Líquido', money(soma(receitas) - soma(despesas)), `Margem ${soma(receitas) ? Math.round(((soma(receitas) - soma(despesas)) / soma(receitas)) * 100) : 0}%`, 'green']])}
      <div class="dash-grid even mt"><div><p class="section-cap">INDICADORES DE EQUIPE</p><div class="soft-list">
        ${[['Profissionais Ativos', `${db.profissionais.filter((p) => p.situacao === 'Ativo').length}/${db.profissionais.length}`], ['Aulas Realizadas', realizadas.length],
          ['Taxa de Ocupação', `${pct(realizadas.length, naoCanceladas.filter((a) => a.data <= isoDate()).length)}%`], ['Alunos Ativos', ativos.length]]
          .map(([k, v]) => `<div class="soft-item"><span class="grow muted">${k}</span><b class="green-text">${v}</b></div>`).join('')}</div></div>
        <div><p class="section-cap">RESUMO FINANCEIRO (6 MESES)</p>${barChart(porMes(receitas).map((r, i) => r - porMes(despesas)[i]), meses6.map(([, m]) => monthShort(m)))}</div></div>`,
    pacientes: () => `${kpis([['Total', pacientes.length], ['Ativos', ativos.length, '', 'green'], ['Inativos', pacientes.length - ativos.length], ['Novos no período', pacientes.filter((p) => dentro(p.created_at.slice(0, 10))).length]])}
      ${tabela(['Paciente', 'Contato', 'Idade', 'Plano', 'Cadastro', 'Status'], pacientes.map((p) => `<tr><td><b class="dark">${esc(p.name)}</b></td><td>${esc(p.email || '—')}<small class="block muted">${p.phone ? maskPhone(p.phone) : ''}</small></td><td>${p.age ?? '—'}</td><td>${esc(planoDoPaciente(p.id)?.nome || 'Sem plano')}</td><td>${dateBR(p.created_at)}</td><td><span class="badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Ativo' : 'Inativo'}</span></td></tr>`))}`,
    agendamentos: () => `${kpis([['Total', ags.length], ['Realizados', realizadas.length, '', 'green'], ['Confirmados', ags.filter((a) => a.status === 'Confirmado').length], ['Cancelados', ags.filter((a) => a.status === 'Cancelado').length, '', 'orange']])}
      ${tabela(['Data', 'Horário', 'Paciente', 'Profissional', 'Sala', 'Situação'], ags.sort((a, b) => `${a.data}${a.inicio}`.localeCompare(`${b.data}${b.inicio}`)).map((a) => `<tr><td>${dateBR(a.data)}</td><td>${a.inicio}–${a.fim}</td><td><b class="dark">${esc(nomes[a.pacienteId] || a.pacienteNome)}</b></td><td>${esc(profissional(a.profissionalId)?.nome || '—')}</td><td>${esc(a.sala)}</td><td>${statusAgenda(a.status)}</td></tr>`))}`,
    faltas: () => `${kpis([['Faltas no período', faltas.length, '', 'orange'], ['Taxa de faltas', `${pct(faltas.length, ags.filter((a) => a.data <= isoDate() && a.status !== 'Cancelado').length)}%`], ['Pacientes com falta', new Set(faltas.map((a) => a.pacienteId)).size], ['Aulas no período', ags.length]])}
      ${tabela(['Data', 'Horário', 'Paciente', 'Profissional'], faltas.map((a) => `<tr><td>${dateBR(a.data)}</td><td>${a.inicio}</td><td><b class="dark">${esc(nomes[a.pacienteId] || a.pacienteNome)}</b></td><td>${esc(profissional(a.profissionalId)?.nome || '—')}</td></tr>`))}`,
    comissoes: () => {
      const linhas = db.profissionais.map((p) => { const aulas = realizadas.filter((a) => a.profissionalId === p.id); return { p, aulas: aulas.length, valor: aulas.reduce((s, a) => s + comissaoDoAgendamento(a), 0) }; });
      return `${kpis([['Total Profissionais', db.profissionais.length], ['Ativos', db.profissionais.filter((p) => p.situacao === 'Ativo').length, '', 'green'], ['Total de Aulas', realizadas.length], ['Média/Profissional', db.profissionais.length ? Math.round(realizadas.length / db.profissionais.length) : 0, 'aulas no período', 'green']])}
        <div class="dash-grid even mt"><div><p class="section-cap">AULAS POR PROFISSIONAL</p>${hBarChart(linhas.map((l) => ({ label: l.p.nome, value: l.aulas })))}</div>
        <div><p class="section-cap">COMISSÃO POR PROFISSIONAL</p>${hBarChart(linhas.map((l) => ({ label: l.p.nome, value: l.valor })), { cls: 'green', format: money })}</div></div>
        <p class="section-cap mt">DETALHES POR PROFISSIONAL</p>${tabela(['Profissional', 'Aulas', 'Comissão gerada'], linhas.map((l) => `<tr><td><b class="dark">${esc(l.p.nome)}</b></td><td class="green-text">${l.aulas}</td><td class="green-text"><b>${money(l.valor)}</b></td></tr>`))}`;
    },
    receitas: () => `${kpis([['Total recebido', money(soma(receitas)), '', 'green'], ['Lançamentos', receitas.length], ['Ticket médio', money(receitas.length ? soma(receitas) / receitas.length : 0)], ['A receber', money(soma(db.cobrancas.filter((c) => c.status === 'Pendente')))]])}
      <p class="section-cap mt">RECEITAS (6 MESES)</p>${barChart(porMes(receitas), meses6.map(([, m]) => monthShort(m)), { cls: 'green' })}
      ${tabela(['Data', 'Descrição', 'Categoria', 'Valor'], receitas.sort((a, b) => b.data.localeCompare(a.data)).map((t) => `<tr><td>${dateBR(t.data)}</td><td>${esc(t.descricao)}</td><td>${esc(t.categoria)}</td><td class="green-text"><b>${money(t.valor)}</b></td></tr>`))}`,
    despesas: () => `${kpis([['Total de despesas', money(soma(despesas)), '', 'orange'], ['Lançamentos', despesas.length], ['Maior categoria', (() => { const c = {}; despesas.forEach((t) => { c[t.categoria] = (c[t.categoria] || 0) + Number(t.valor); }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'; })()], ['Média por lançamento', money(despesas.length ? soma(despesas) / despesas.length : 0)]])}
      <p class="section-cap mt">DESPESAS (6 MESES)</p>${barChart(porMes(despesas), meses6.map(([, m]) => monthShort(m)), { cls: 'red' })}
      ${tabela(['Data', 'Descrição', 'Categoria', 'Valor'], despesas.sort((a, b) => b.data.localeCompare(a.data)).map((t) => `<tr><td>${dateBR(t.data)}</td><td>${esc(t.descricao)}</td><td>${esc(t.categoria)}</td><td class="red-text"><b>${money(t.valor)}</b></td></tr>`))}`,
    planos: () => {
      const ativosIds = new Set(ativos.map((p) => p.id));
      const linhas = db.planos.map((p) => { const n = Object.entries(db.vinculos).filter(([pac, pl]) => pl === p.id && ativosIds.has(pac)).length; return { p, n }; });
      return `${kpis([['Planos', db.planos.length], ['Ativos', db.planos.filter((p) => p.ativo).length, '', 'green'], ['Alunos com plano', linhas.reduce((a, l) => a + l.n, 0)], ['Receita estimada', money(linhas.reduce((a, l) => a + l.n * l.p.preco, 0)), 'por mês', 'green']])}
        ${tabela(['Plano', 'Preço', 'Aulas', 'Alunos', 'Receita estimada', 'Situação'], linhas.map(({ p, n }) => `<tr><td><b class="dark">${esc(p.nome)}</b></td><td>${money(p.preco)}</td><td>${p.aulas}</td><td>${n}</td><td class="green-text">${money(n * p.preco)}</td><td><span class="badge ${p.ativo ? 'active' : 'inactive'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td></tr>`))}`;
    },
  };
  const aba = abas.find((a) => a[0] === st.aba);
  el.innerHTML = `${crumb('Relatórios')}
    <div class="panel report-head"><div><h1 class="h-sm">Relatórios</h1><p class="muted">Análises e exportações do sistema</p></div>
      <div class="period"><span class="green-text">${svg('calendar')}</span>Período: <input type="date" id="rel-ini" value="${st.inicio}" aria-label="Data inicial" /> – <input type="date" id="rel-fim" value="${st.fim}" aria-label="Data final" /></div></div>
    <div class="report-tabs">${abas.map(([k, i, t, s]) => `<button type="button" data-rel="${k}" class="${k === st.aba ? 'selected' : ''}"><span class="tile">${svg(i)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div>
    <div id="rel-area">
      <div class="panel report-title"><span class="tile">${svg(aba[1])}</span><div class="grow"><b>${aba[2]}</b><small class="block muted">Período: ${dateBR(st.inicio)} – ${dateBR(st.fim)}</small></div><button class="btn btn-primary no-print" type="button" id="rel-pdf">${svg('download')}Exportar PDF</button></div>
      <div class="panel mt">${conteudo[st.aba]()}</div>
    </div>`;
  el.querySelectorAll('[data-rel]').forEach((b) => b.addEventListener('click', () => { st.aba = b.dataset.rel; render(el).then(() => renderIcons(el)); }));
  const periodo = () => { if ($('rel-ini').value && $('rel-fim').value && $('rel-ini').value <= $('rel-fim').value) { st.inicio = $('rel-ini').value; st.fim = $('rel-fim').value; render(el).then(() => renderIcons(el)); } };
  $('rel-ini').addEventListener('change', periodo);
  $('rel-fim').addEventListener('change', periodo);
  $('rel-pdf').addEventListener('click', () => printArea($('rel-area')));
}
