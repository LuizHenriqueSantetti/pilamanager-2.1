// Configurações. Meu Perfil (nome/e-mail), Usuários do Sistema e Segurança (senha) ficam no PostgreSQL.
// Clínica, Aparência, Cargos e Permissões e Idioma ficam no navegador, como no original.
import { $, state, esc, svg, api, toast, openModal, box, options, roleNames, canManage, initials, maskPhone, storage } from './nucleo.js';
import { dados, salvar, modulosPermissao } from './dados.js';

const avisar = (evento, detail) => window.dispatchEvent(new CustomEvent(evento, { detail }));
const abas = [['perfil', 'user', 'Meu Perfil'], ['clinica', 'building', 'Clínica', true], ['aparencia', 'palette', 'Aparência'], ['privacidade', 'file', 'Política de Privacidade'],
  ['usuarios', 'users', 'Usuários do Sistema', true], ['cargos', 'shield', 'Cargos e Permissões', true], ['seguranca', 'lock', 'Segurança'], ['idioma', 'globe', 'Idioma']];

export function openSettings(tab = 'perfil') {
  const visiveis = abas.filter((a) => !a[3] || canManage());
  if (!visiveis.some((a) => a[0] === tab)) tab = 'perfil';
  openModal({ title: 'Configurações', compact: true, size: 'settings', html: `<div class="tabs">${visiveis.map(([k, i, l]) => `<button type="button" data-tab="${k}" class="${k === tab ? 'selected' : ''}">${svg(i)}${l}</button>`).join('')}</div><div id="settings-panel"></div>` });
  $('modal-body').querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    $('modal-body').querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('selected', x === b));
    mostrar(b.dataset.tab);
  }));
  mostrar(tab);
}

const imagem = (input, max, cb) => input.addEventListener('change', () => {
  const file = input.files[0]; if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast('Use uma imagem JPG, PNG ou WebP.', true);
  if (file.size > max) return toast('A imagem é grande demais.', true);
  const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file);
});

function mostrar(tab) {
  const panel = $('settings-panel');
  const titulo = abas.find((a) => a[0] === tab)[2];
  const db = dados();
  const cab = `<div class="settings-title">${titulo}</div>`;
  if (tab === 'perfil') {
    const u = state.user;
    let foto = db.perfil.foto;
    panel.innerHTML = `${cab}<form class="settings-body" id="perfil-form" novalidate>
      <p class="sub-title no-m">Foto de Perfil</p>
      <div class="foto-row"><span class="foto round" id="perfil-prev">${foto ? `<img src="${esc(foto)}" alt="" />` : esc(initials(u.name))}</span><label class="btn btn-outline small file-btn">${svg('camera')}Alterar foto<input type="file" id="perfil-foto" accept="image/png,image/jpeg,image/webp" /></label></div>
      <small class="muted">JPG, PNG ou WebP, até 10 MB. Após escolher, clique em Salvar Perfil.</small>
      <div class="form-grid one mt">
        ${box('pf-nome', 'Nome Completo', `<input id="pf-nome" name="name" required maxlength="120" value="${esc(u.name)}" />`)}
        ${box('pf-email', 'E-mail', `<input id="pf-email" name="email" type="email" required maxlength="254" value="${esc(u.email)}" />`)}
        ${box('pf-tel', 'Telefone', `<input id="pf-tel" maxlength="16" placeholder="(00) 00000-0000" value="${esc(maskPhone(db.perfil.telefone))}" />`)}
        ${box('pf-cargo', 'Cargo', `<input id="pf-cargo" readonly value="${esc(roleNames[u.role])}" />`)}
      </div><div id="perfil-erro" class="form-error"></div>
      <button class="btn btn-primary" type="submit">Salvar Perfil</button></form>`;
    imagem($('perfil-foto'), 10 * 1024 * 1024, (src) => { foto = src; $('perfil-prev').innerHTML = `<img src="${src}" alt="" />`; });
    $('pf-tel').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
    $('perfil-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const { user } = await api('/api/auth/me', { method: 'PATCH', data: { name: $('pf-nome').value, email: $('pf-email').value } });
        state.user = { ...state.user, ...user };
        db.perfil.telefone = $('pf-tel').value.replace(/\D/g, ''); db.perfil.foto = foto; salvar();
        avisar('pm:perfil'); toast('Perfil salvo.'); $('perfil-erro').textContent = '';
      } catch (err) { $('perfil-erro').textContent = err.message; }
    });
  } else if (tab === 'clinica') {
    const c = db.clinica; let logo = c.logo;
    const campo = (id, label, icone, valor, ph) => box(id, label, `<div class="input-icon flat"><span>${svg(icone)}</span><input id="${id}" value="${esc(valor)}" placeholder="${ph}" /></div>`);
    panel.innerHTML = `${cab}<form class="settings-body" id="clinica-form">
      <p class="sub-title no-m">Logo da Clínica</p>
      <div class="foto-row"><span class="foto" id="logo-prev">${logo ? `<img src="${esc(logo)}" alt="" />` : svg('building')}</span><label class="btn btn-outline small file-btn">${svg('camera')}Alterar logo<input type="file" id="logo-file" accept="image/png,image/jpeg,image/webp" /></label></div>
      <small class="muted">JPG, PNG ou WebP, até 10 MB. Após escolher, clique em Salvar Clínica.</small>
      <div class="form-grid one mt">
        ${campo('cl-sis', 'Nome exibido no sistema', 'building', c.nomeSistema, 'PilaManager')}${campo('cl-desc', 'Descrição da clínica', 'building', c.descricao, 'PilaManager Studio')}
        ${campo('cl-nome', 'Nome da Clínica', 'building', c.nome, 'Nome do estúdio')}${campo('cl-tel', 'Telefone', 'phone', c.telefone, '(00) 00000-0000')}
        ${campo('cl-end', 'Endereço', 'building', c.endereco, 'Rua, número, bairro, cidade')}${campo('cl-hor', 'Horários de Funcionamento', 'clock', c.horarios, 'Ex: Seg–Sex 07h–20h, Sáb 08h–13h')}
      </div><button class="btn btn-primary mt" type="submit">Salvar Clínica</button></form>`;
    imagem($('logo-file'), 10 * 1024 * 1024, (src) => { logo = src; $('logo-prev').innerHTML = `<img src="${src}" alt="" />`; });
    $('cl-tel').addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
    $('clinica-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Object.assign(c, { nomeSistema: $('cl-sis').value.trim() || 'PilaManager', descricao: $('cl-desc').value.trim(), nome: $('cl-nome').value.trim(), telefone: $('cl-tel').value, endereco: $('cl-end').value.trim(), horarios: $('cl-hor').value.trim(), logo });
      salvar(); avisar('pm:clinica'); toast('Dados da clínica salvos.');
    });
  } else if (tab === 'aparencia') {
    const tema = document.documentElement.dataset.theme;
    panel.innerHTML = `${cab}<div class="settings-body"><p class="muted">Escolha o tema visual do sistema.</p>
      <div class="field-box">${`<label for="ap-trans">Transição entre temas</label><select id="ap-trans">${options([['suave', 'Transição suave'], ['nenhuma', 'Sem animação']], db.preferencias.transicao)}</select>`}<small class="muted">Se o sistema estiver reduzindo movimento, escolha Transição suave para animar somente as cores. A opção de acessibilidade Sem animações continua tendo prioridade.</small></div>
      <div class="theme-cards mt"><button type="button" class="theme-card light ${tema !== 'dark' ? 'selected' : ''}" data-tema="light"><span class="tile">${svg('sun')}</span><b>Tema Claro</b>${tema !== 'dark' ? '<small>✓ Ativo</small>' : ''}</button>
      <button type="button" class="theme-card dark ${tema === 'dark' ? 'selected' : ''}" data-tema="dark"><span class="tile">${svg('moon')}</span><b>Tema Escuro</b>${tema === 'dark' ? '<small>✓ Ativo</small>' : ''}</button></div></div>`;
    $('ap-trans').addEventListener('change', (e) => { db.preferencias.transicao = e.target.value; salvar(); document.documentElement.classList.toggle('sem-transicao', e.target.value === 'nenhuma'); });
    panel.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => { avisar('pm:tema', b.dataset.tema); mostrar('aparencia'); }));
  } else if (tab === 'privacidade') {
    panel.innerHTML = `${cab}<div class="settings-body privacy-text"><p>O PilaManager guarda somente as informações necessárias para o atendimento no estúdio.</p>
      <h3>Quais dados são guardados</h3><p>Dados cadastrais dos pacientes, informações de acompanhamento, agenda, planos e pagamentos, além das contas de acesso da equipe.</p>
      <h3>Como são protegidos</h3><p>O acesso exige login, com permissões por cargo. As senhas são guardadas criptografadas e as sessões expiram automaticamente.</p>
      <h3>Direitos do titular</h3><p>O paciente pode pedir acesso, correção ou exclusão dos seus dados à Gerência, conforme a LGPD.</p></div>`;
  } else if (tab === 'usuarios') {
    carregarUsuarios(panel, cab);
  } else if (tab === 'cargos') {
    cargos(panel, cab);
  } else if (tab === 'seguranca') {
    const senha = (id, label) => box(id, label, `<div class="input-icon flat"><span>${svg('lock')}</span><input id="${id}" type="password" autocomplete="${id === 'sg-atual' ? 'current-password' : 'new-password'}" placeholder="••••••••" /><button type="button" class="input-action" data-ver="${id}" aria-label="Mostrar senha">${svg('eye')}</button></div>`);
    panel.innerHTML = `${cab}<form class="settings-body" id="seg-form"><p class="sub-title no-m">Alterar Senha</p><div class="form-grid one">${senha('sg-atual', 'Senha Atual')}${senha('sg-nova', 'Nova Senha')}${senha('sg-conf', 'Confirmar Nova Senha')}</div>
      <small class="muted">A nova senha precisa ter pelo menos 12 caracteres.</small><div id="seg-erro" class="form-error"></div><button class="btn btn-primary" type="submit">Alterar Senha</button></form>`;
    panel.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => { const i = $(b.dataset.ver); i.type = i.type === 'password' ? 'text' : 'password'; b.innerHTML = svg(i.type === 'password' ? 'eye' : 'eyeOff'); }));
    $('seg-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const erro = $('seg-erro'); erro.textContent = '';
      if ($('sg-nova').value !== $('sg-conf').value) { erro.textContent = 'A confirmação não é igual à nova senha.'; return; }
      try {
        await api('/api/auth/password', { method: 'POST', data: { current_password: $('sg-atual').value, new_password: $('sg-nova').value } });
        e.target.reset(); toast('Senha alterada com sucesso.');
      } catch (err) { erro.textContent = err.message; }
    });
  } else if (tab === 'idioma') {
    panel.innerHTML = `${cab}<div class="settings-body"><div class="form-grid one">
      ${box('id-lang', 'Idioma do sistema', `<select id="id-lang">${options([['pt-BR', 'Português (Brasil)']], db.preferencias.idioma)}</select>`)}
      ${box('id-data', 'Formato de data', `<select id="id-data">${options([['dd/mm/aaaa', 'dd/mm/aaaa (padrão brasileiro)']], 'dd/mm/aaaa')}</select>`)}
      ${box('id-moeda', 'Moeda', `<select id="id-moeda">${options([['BRL', 'Real (R$)']], 'BRL')}</select>`)}</div>
      <small class="muted">O sistema está disponível em português do Brasil.</small></div>`;
  }
}

// ---------- Usuários do Sistema (PostgreSQL) ----------
async function carregarUsuarios(panel, cab) {
  panel.innerHTML = `${cab}<div class="settings-body"><p class="empty">Carregando usuários...</p></div>`;
  try {
    const { items } = await api('/api/users');
    panel.innerHTML = `${cab}<div class="settings-body">
      <div class="settings-bar"><span>Gerencie contas de acesso ao sistema.</span><button class="btn btn-primary" type="button" id="new-user">${svg('plus')}Novo</button></div>
      ${items.map((u) => {
        const self = u.id === state.user.id;
        const locked = self || (u.role === 'GERENCIA' && state.user.role !== 'GERENCIA');
        return `<div class="user-row"><span class="avatar sm">${esc(u.name.trim()[0]?.toUpperCase() || '?')}</span>
          <div class="grow"><b>${esc(u.name)}${self ? '<span class="you">(você)</span>' : ''}</b><small>${esc(u.email)} · ${roleNames[u.role] || u.role}</small></div>
          <span class="badge ${u.active ? 'active' : 'inactive'}">${u.active ? 'Ativo' : 'Inativo'}</span>
          <div class="row-actions">${locked ? '' : `<button type="button" class="power ${u.active ? '' : 'on'}" data-user="${u.id}" data-active="${u.active}" data-name="${esc(u.name)}" title="${u.active ? 'Desativar' : 'Ativar'}" aria-label="${u.active ? 'Desativar' : 'Ativar'} ${esc(u.name)}">${svg('power')}</button>`}</div></div>`;
      }).join('')}</div>`;
    $('new-user').addEventListener('click', () => novoUsuario(panel, cab));
    panel.querySelectorAll('[data-user]').forEach((b) => b.addEventListener('click', () => alternarUsuario(b.dataset.user, b.dataset.active === 'true', b.dataset.name, panel, cab)));
  } catch (e) { panel.innerHTML = `${cab}<div class="settings-body"><p class="form-error">${esc(e.message)}</p></div>`; }
}
async function alternarUsuario(id, active, name, panel, cab) {
  if (active) {
    const ok = await new Promise((resolve) => {
      const bar = document.createElement('div');
      bar.className = 'user-row';
      bar.innerHTML = `<div class="grow"><b>Desativar ${esc(name)}?</b><small>A pessoa não conseguirá mais entrar no sistema.</small></div><button class="btn btn-ghost" type="button">Cancelar</button><button class="btn btn-danger" type="button">Desativar</button>`;
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
    carregarUsuarios(panel, cab);
  } catch (e) { toast(e.message, true); }
}
function novoUsuario(panel, cab) {
  const roles = Object.entries(roleNames).filter(([r]) => r !== 'GERENCIA' || state.user.role === 'GERENCIA');
  panel.innerHTML = `<div class="settings-title">Novo usuário</div><form class="settings-body" id="user-form" novalidate><div class="form-grid">
    ${box('u-name', 'Nome completo *', '<input id="u-name" name="name" maxlength="120" required />', true)}
    ${box('u-email', 'E-mail *', '<input id="u-email" name="email" type="email" maxlength="254" required />', true)}
    ${box('u-role', 'Cargo *', `<select id="u-role" name="role" required><option value="">Selecione</option>${roles.map(([r, l]) => `<option value="${r}">${l}</option>`).join('')}</select>`)}
    ${box('u-password', 'Senha provisória *', '<input id="u-password" name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" placeholder="Mínimo de 12 caracteres" required />')}
  </div><div id="user-error" class="form-error" role="alert"></div>
  <div class="modal-actions"><button class="btn btn-ghost" type="button" id="user-back">Voltar</button><button class="btn btn-primary" type="submit" id="save-user">Criar usuário</button></div></form>`;
  $('u-name').focus();
  $('user-back').addEventListener('click', () => carregarUsuarios(panel, cab));
  $('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = $('save-user'); submit.disabled = true;
    $('user-error').textContent = '';
    try {
      await api('/api/users', { method: 'POST', data: Object.fromEntries(new FormData(e.currentTarget).entries()) });
      toast('Usuário criado com sucesso.');
      carregarUsuarios(panel, cab);
    } catch (err) { $('user-error').textContent = err.message; submit.disabled = false; }
  });
}

// ---------- Cargos e Permissões ----------
async function cargos(panel, cab) {
  let contagem = {};
  try { (await api('/api/users')).items.forEach((u) => { contagem[u.role] = (contagem[u.role] || 0) + 1; }); } catch { contagem = {}; }
  const db = dados();
  let atual = null;
  const desenhar = () => {
    panel.innerHTML = `${cab}<div class="roles"><div class="roles-list"><div class="roles-head">CARGOS</div>
      ${Object.entries(roleNames).map(([k, l]) => `<button type="button" data-cargo="${k}" class="${k === atual ? 'selected' : ''}"><b>${l}</b><small>${contagem[k] || 0} usuário${(contagem[k] || 0) === 1 ? '' : 's'}</small></button>`).join('')}</div>
      <div class="roles-detail">${atual ? `<p class="sub-title no-m">Permissões de ${roleNames[atual]}</p>
        ${atual === 'GERENCIA' ? '<p class="muted">A Gerência tem acesso a todas as telas.</p>' : ''}
        <div class="perm-list">${modulosPermissao.map(([k, l]) => `<label class="switch"><input type="checkbox" data-perm="${k}" ${db.cargos[atual][k] !== false ? 'checked' : ''} ${atual === 'GERENCIA' ? 'disabled' : ''} /><span></span>${l}</label>`).join('')}</div>
        ${atual !== 'GERENCIA' ? '<button class="btn btn-primary mt" type="button" id="perm-salvar">Salvar permissões</button>' : ''}
        <small class="muted block mt">Usuários e pacientes também são protegidos no servidor: só Gerência e Administrador criam contas, e o Profissional não altera pacientes.</small>`
      : `<div class="empty center">${svg('shield')}<p>Selecione um cargo para ver e editar as permissões.</p></div>`}</div></div>`;
    panel.querySelectorAll('[data-cargo]').forEach((b) => b.addEventListener('click', () => { atual = b.dataset.cargo; desenhar(); }));
    $('perm-salvar')?.addEventListener('click', () => {
      panel.querySelectorAll('[data-perm]').forEach((i) => { db.cargos[atual][i.dataset.perm] = i.checked; });
      db.cargos[atual].dashboard = true;
      salvar(); avisar('pm:permissoes'); toast(`Permissões de ${roleNames[atual]} salvas.`);
    });
  };
  desenhar();
}
export { storage };
