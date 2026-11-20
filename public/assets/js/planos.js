// Planos — funciona no navegador, como no original. "Vínculos" contam os pacientes do banco com o plano.
import { $, esc, svg, toast, openModal, closeModal, confirmDialog, box, options, newId, money, crumb, recarregar, canManage, allPatients, renderIcons } from './nucleo.js';
import { dados, salvar } from './dados.js';

const filtros = { busca: '', situacao: 'todos' };

export async function render(el) {
  const db = dados();
  const ativosPac = new Set((await allPatients()).filter((p) => p.active).map((p) => p.id));
  const vinculos = (id) => Object.entries(db.vinculos).filter(([pac, pl]) => pl === id && ativosPac.has(pac)).length;
  const ativos = db.planos.filter((p) => p.ativo);
  const inscritos = db.planos.reduce((a, p) => a + vinculos(p.id), 0);
  const receita = db.planos.reduce((a, p) => a + vinculos(p.id) * (p.duracao === 'Mensal' ? p.preco : p.preco / ({ Trimestral: 3, Semestral: 6, Anual: 12 }[p.duracao] || 1)), 0);
  const kpi = (i, v, t, cls = '') => `<div class="kpi row"><span class="stat-icon sm ${cls}">${svg(i)}</span><div><b class="${cls === 'orange' ? 'orange' : ''}">${v}</b><small>${t}</small></div></div>`;
  el.innerHTML = `${crumb('Planos')}
    <div class="list-heading"><div><h1 class="h-sm">Planos</h1><p>Catálogo de serviços e vínculos · <b class="green">${ativos.length} ativos</b></p></div>
      ${canManage() ? `<button class="btn btn-primary" type="button" id="novo-plano">${svg('plus')}Novo Plano</button>` : ''}</div>
    <div class="kpi-grid">${kpi('card', db.planos.length, 'Total de Planos')}${kpi('zap', ativos.length, 'Planos Ativos', 'green')}${kpi('userCheck', inscritos, 'Alunos Inscritos')}${kpi('trendUp', money(receita), 'Receita Mensal Est.', 'orange')}</div>
    <div class="filters-row"><div class="search-box"><span>${svg('search')}</span><input id="pl-busca" type="search" placeholder="Buscar planos..." value="${esc(filtros.busca)}" aria-label="Buscar planos" /></div>
      <div class="seg">${[['todos', 'Todos'], ['ativos', 'Ativos'], ['inativos', 'Inativos']].map(([k, l]) => `<button type="button" data-sit="${k}" class="${filtros.situacao === k ? 'selected' : ''}">${l}</button>`).join('')}</div></div>
    <div class="table-card"><table><thead><tr><th>Plano e benefícios</th><th>Investimento</th><th>Vínculos</th><th>Gerenciar</th></tr></thead><tbody id="pl-rows"></tbody></table></div>`;
  const desenhar = () => {
    const b = filtros.busca.toLowerCase();
    const lista = db.planos.filter((p) => (filtros.situacao === 'todos' || (filtros.situacao === 'ativos') === p.ativo) && (!b || `${p.nome} ${p.descricao}`.toLowerCase().includes(b)));
    $('pl-rows').innerHTML = lista.length ? lista.map((p) => `<tr class="tall">
      <td class="wrap"><b class="plan-name">${esc(p.nome)}</b> <span class="badge ${p.ativo ? 'active' : 'inactive'}">${p.ativo ? 'Ativo' : 'Inativo'}</span>${p.destaque ? ' <span class="badge pending">Destaque</span>' : ''}
        <p class="muted small-p">${esc(p.descricao)}</p><div class="chip-row">${p.beneficios.map((x) => `<span class="badge plan">${esc(x)}</span>`).join('')}</div></td>
      <td><b class="price">${money(p.preco)}</b><small class="block muted">${esc(p.duracao)} · ${p.aulas} aulas</small></td>
      <td><span class="green-text">${svg('users')} <b>${vinculos(p.id)}</b></span><small class="block muted">alunos vinculados</small></td>
      <td>${canManage() ? `<div class="row-actions boxed"><button type="button" class="btn btn-ghost small" data-pl="editar" data-id="${p.id}">${svg('pencil')}Editar</button>
        <button type="button" data-pl="duplicar" data-id="${p.id}" title="Duplicar" aria-label="Duplicar ${esc(p.nome)}">${svg('copy')}</button>
        <button type="button" data-pl="status" data-id="${p.id}" title="${p.ativo ? 'Desativar' : 'Ativar'}" aria-label="Ativar ou desativar ${esc(p.nome)}">${svg('power')}</button>
        <button type="button" class="del" data-pl="excluir" data-id="${p.id}" title="Excluir" aria-label="Excluir ${esc(p.nome)}">${svg('trash')}</button></div>` : '—'}</td></tr>`).join('')
      : '<tr><td class="empty-row" colspan="4">Nenhum plano encontrado.</td></tr>';
    $('pl-rows').querySelectorAll('[data-pl]').forEach((btn) => btn.addEventListener('click', () => acao(btn.dataset.pl, btn.dataset.id, vinculos)));
  };
  $('novo-plano')?.addEventListener('click', () => planoModal());
  $('pl-busca').addEventListener('input', (e) => { filtros.busca = e.target.value; desenhar(); });
  el.querySelectorAll('[data-sit]').forEach((b) => b.addEventListener('click', () => { filtros.situacao = b.dataset.sit; render(el).then(() => renderIcons(el)); }));
  desenhar();
}

async function acao(tipo, id, vinculos) {
  const db = dados();
  const p = db.planos.find((x) => x.id === id); if (!p) return;
  if (tipo === 'editar') return planoModal(p);
  if (tipo === 'duplicar') { db.planos.push({ ...p, id: newId(), nome: `${p.nome} (cópia)`, beneficios: [...p.beneficios] }); salvar(); toast('Plano duplicado.'); return recarregar(); }
  if (tipo === 'status') { p.ativo = !p.ativo; salvar(); toast(`Plano ${p.ativo ? 'ativado' : 'desativado'}.`); return recarregar(); }
  if (tipo === 'excluir') {
    const n = Object.values(db.vinculos).filter((x) => x === id).length;
    if (n) return toast(`Este plano tem ${n} paciente(s) vinculado(s). Desative o plano em vez de excluir.`, true);
    if (!(await confirmDialog('Excluir plano', `O plano ${p.nome} será excluído.`, 'Excluir', true))) return;
    db.planos = db.planos.filter((x) => x.id !== id); salvar(); toast('Plano excluído.'); recarregar();
  }
}

function planoModal(p = null) {
  openModal({ title: p ? 'Editar Plano' : 'Novo Plano', subtitle: 'Configure os detalhes do plano', iconName: 'card', html: `
    <form id="pl-form" class="modal-content" novalidate><div class="form-grid">
      ${box('pl-nome', 'Nome do Plano *', `<input id="pl-nome" name="nome" required maxlength="80" placeholder="Ex: Plano Premium" value="${esc(p?.nome || '')}" />`, true)}
      ${box('pl-desc', 'Descrição', `<textarea id="pl-desc" name="descricao" maxlength="400" placeholder="Descreva o plano brevemente">${esc(p?.descricao || '')}</textarea>`, true)}
      ${box('pl-preco', 'Preço (R$) *', `<input id="pl-preco" name="preco" type="number" min="0" step="0.01" required placeholder="0,00" value="${p?.preco ?? ''}" />`)}
      ${box('pl-dur', 'Duração', `<select id="pl-dur" name="duracao">${options(['Mensal', 'Trimestral', 'Semestral', 'Anual'], p?.duracao || 'Mensal')}</select>`)}
      ${box('pl-aulas', 'Quantidade de Aulas *', `<input id="pl-aulas" name="aulas" type="number" min="1" max="999" required placeholder="Ex: 8" value="${p?.aulas ?? ''}" />`, true)}
    </div>
    <div class="row-between mt"><b class="sub-title no-m">Benefícios</b><button type="button" class="btn btn-soft small" id="pl-add">${svg('plus')}Adicionar</button></div>
    <div id="pl-benef">${(p?.beneficios?.length ? p.beneficios : ['']).map((b, i) => `<div class="rep-row"><input data-benef placeholder="Benefício ${i + 1}" value="${esc(b)}" aria-label="Benefício" /><button type="button" class="icon-btn ghost" data-remover aria-label="Remover">${svg('x')}</button></div>`).join('')}</div>
    <div class="toggle-row"><label class="switch"><input type="checkbox" id="pl-ativo" ${p ? (p.ativo ? 'checked' : '') : 'checked'} /><span></span>Ativo</label><label class="switch"><input type="checkbox" id="pl-dest" ${p?.destaque ? 'checked' : ''} /><span></span>Destacado</label></div>
    <div id="pl-erro" class="form-error" role="alert"></div>
    <div class="modal-actions stretch"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="submit">${p ? 'Salvar Plano' : 'Criar Plano'}</button></div></form>` });
  $('pl-add').addEventListener('click', () => {
    const n = $('pl-benef').children.length + 1;
    $('pl-benef').insertAdjacentHTML('beforeend', `<div class="rep-row"><input data-benef placeholder="Benefício ${n}" aria-label="Benefício" /><button type="button" class="icon-btn ghost" data-remover aria-label="Remover">${svg('x')}</button></div>`);
  });
  $('pl-benef').addEventListener('click', (e) => { if (e.target.closest('[data-remover]')) e.target.closest('.rep-row').remove(); });
  $('pl-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget, erro = $('pl-erro');
    form.querySelectorAll('.invalid').forEach((x) => x.classList.remove('invalid'));
    const vazio = [...form.querySelectorAll('[required]')].filter((x) => !x.value.trim());
    if (vazio.length) { vazio.forEach((x) => x.closest('.field-box').classList.add('invalid')); erro.textContent = 'Preencha os campos obrigatórios destacados.'; return; }
    const f = Object.fromEntries(new FormData(form).entries());
    if (Number(f.preco) <= 0) { erro.textContent = 'Informe um preço maior que zero.'; return; }
    if (dados().planos.some((x) => x.nome.toLowerCase() === f.nome.trim().toLowerCase() && x.id !== p?.id)) { erro.textContent = 'Já existe um plano com esse nome.'; return; }
    const novo = { id: p?.id || newId(), nome: f.nome.trim(), descricao: f.descricao.trim(), preco: Number(f.preco), duracao: f.duracao, aulas: Number(f.aulas),
      beneficios: [...form.querySelectorAll('[data-benef]')].map((i) => i.value.trim()).filter(Boolean), ativo: $('pl-ativo').checked, destaque: $('pl-dest').checked };
    if (p) Object.assign(p, novo); else dados().planos.push(novo);
    salvar(); closeModal(); toast(p ? 'Plano atualizado.' : 'Plano criado com sucesso.'); recarregar();
  });
}
