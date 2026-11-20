// Painel de Acessibilidade (botão ao lado do tema), como no original. Preferências ficam no navegador.
import { $, svg, storage, onToast, esc } from './nucleo.js';

const opcoes = [
  ['contraste', 'eye', 'Contraste forte', 'Aumenta o contraste para baixa visão.'],
  ['leitor', 'pointer', 'Leitor ao passar o mouse', 'Mostra a descrição do item em foco ou sob o mouse.'],
  ['legendas', 'captions', 'Libras e legendas', 'Abre um painel textual para avisos e ações.'],
  ['som', 'bell', 'Som e alerta visual', 'Emite um som e mostra um aviso em cada ação.'],
  ['teclado', 'keyboard', 'Teclado sem mouse', 'As setas navegam entre botões e campos.'],
  ['botoes', 'pointer', 'Botões maiores', 'Aumenta os controles para facilitar o toque.'],
  ['animacoes', 'pause', 'Sem animações ou zoom', 'Remove transições, zoom e movimentos.'],
  ['leitura', 'type', 'Modo de leitura simples', 'Deixa o texto mais limpo, forte e espaçado.'],
];
const daltonismo = [['', 'Nenhum'], ['protanopia', 'Protanopia (vermelho)'], ['deuteranopia', 'Deuteranopia (verde)'], ['tritanopia', 'Tritanopia (azul)'], ['cinza', 'Tons de cinza']];
let pref = storage.get('plm_a11y', {});
let applyTheme;

function aplicar() {
  const html = document.documentElement;
  opcoes.forEach(([k]) => html.classList.toggle(`a11y-${k}`, Boolean(pref[k])));
  daltonismo.forEach(([k]) => k && html.classList.toggle(`dalt-${k}`, pref.daltonismo === k));
  $('a11y-captions').classList.toggle('hidden', !pref.legendas);
  if (!pref.leitor) $('a11y-hover').classList.add('hidden');
  storage.set('plm_a11y', pref);
}

function desenhar() {
  const tema = document.documentElement.dataset.theme === 'dark' ? 'Escuro' : 'Claro';
  $('a11y-panel').innerHTML = `<div class="a11y-head"><div><b>Acessibilidade</b><small>Escolha recursos para visão, audição, fala, teclado e movimento.</small></div><button type="button" class="badge plan btn-badge" id="a11y-padrao">Padrão</button></div>
    <label class="a11y-item select">${svg('alert')}<span class="grow"><b>Daltonismo</b><select id="a11y-dalt" aria-label="Tipo de daltonismo">${daltonismo.map(([k, l]) => `<option value="${k}" ${pref.daltonismo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></span></label>
    <button type="button" class="a11y-item" id="a11y-tema">${svg('moon')}<span class="grow"><b>Tema claro/escuro</b><small>Clique para usar tema ${tema === 'Claro' ? 'escuro' : 'claro'}.</small></span><span class="green-text small-b">${tema}</span></button>
    ${opcoes.map(([k, i, t, d]) => `<label class="a11y-item">${svg(i)}<span class="grow"><b>${t}</b><small>${d}</small></span><span class="switch only"><input type="checkbox" data-a11y="${k}" ${pref[k] ? 'checked' : ''} aria-label="${t}" /><span></span></span></label>`).join('')}
    <p class="a11y-foot">${svg('keyboard')}Cada opção liga ou desliga ao clicar. O botão Padrão remove tudo.</p>`;
  $('a11y-padrao').addEventListener('click', () => { pref = {}; aplicar(); desenhar(); });
  $('a11y-dalt').addEventListener('change', (e) => { pref.daltonismo = e.target.value; aplicar(); });
  $('a11y-tema').addEventListener('click', () => { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); desenhar(); });
  $('a11y-panel').querySelectorAll('[data-a11y]').forEach((i) => i.addEventListener('change', () => { pref[i.dataset.a11y] = i.checked; aplicar(); }));
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.05;
    o.start(); o.stop(ctx.currentTime + 0.12);
  } catch { /* sem áudio */ }
}

export function initAcessibilidade(themeFn) {
  applyTheme = themeFn;
  aplicar();
  $('a11y-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    const aberto = $('a11y-panel').classList.toggle('hidden') === false;
    $('a11y-trigger').setAttribute('aria-expanded', String(aberto));
    if (aberto) desenhar();
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.a11y-menu')) $('a11y-panel').classList.add('hidden'); });
  // Legendas e som acompanham as mensagens do sistema.
  onToast((msg, erro) => {
    if (pref.legendas) {
      const cap = $('a11y-captions');
      cap.insertAdjacentHTML('afterbegin', `<p class="${erro ? 'red-text' : ''}">${new Date().toLocaleTimeString('pt-BR').slice(0, 5)} — ${esc(msg)}</p>`);
      while (cap.children.length > 4) cap.lastElementChild.remove();
    }
    if (pref.som) { bip(); document.body.classList.add('flash'); setTimeout(() => document.body.classList.remove('flash'), 300); }
  });
  // Leitor: mostra a descrição do elemento sob o mouse ou em foco.
  const mostrarDescricao = (el, x, y) => {
    if (!pref.leitor || !el) return;
    const alvo = el.closest('button, a, input, select, textarea, [title], [aria-label], th, td, h1, h2, label');
    const texto = alvo && (alvo.getAttribute('aria-label') || alvo.getAttribute('title') || alvo.labels?.[0]?.textContent || alvo.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const box = $('a11y-hover');
    if (!texto) { box.classList.add('hidden'); return; }
    box.textContent = texto; box.classList.remove('hidden');
    box.style.setProperty('--x', `${Math.min(x + 14, window.innerWidth - 260)}px`);
    box.style.setProperty('--y', `${y + 18}px`);
  };
  document.addEventListener('mouseover', (e) => mostrarDescricao(e.target, e.clientX, e.clientY));
  document.addEventListener('focusin', (e) => { const r = e.target.getBoundingClientRect(); mostrarDescricao(e.target, r.left, r.bottom); });
  // Teclado: setas movem o foco entre botões e campos.
  document.addEventListener('keydown', (e) => {
    if (!pref.teclado || !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) && ['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const itens = [...document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea')].filter((x) => x.offsetParent !== null);
    const i = itens.indexOf(document.activeElement);
    const prox = itens[(i + (['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : -1) + itens.length) % itens.length];
    if (prox) { e.preventDefault(); prox.focus(); }
  });
}
