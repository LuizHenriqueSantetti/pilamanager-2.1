// Teste de interface nos navegadores reais instalados (Google Chrome e Microsoft Edge).
// Execute com o sistema iniciado: npm run test:navegadores
// Abre as janelas visíveis (perfil temporário, sem tocar nos dados do seu navegador),
// salva capturas em docs/evidencias/<navegador>/ e confere os dados no PostgreSQL.
// Cria apenas pacientes "Teste Navegador ..." e os apaga ao final.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { pool, query } from '../../server/lib/db.js';

// playwright-core é dependência só de teste: o iniciador instala apenas o necessário para rodar o sistema.
let chromium = null;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('\n  Ferramenta de teste ausente. Rode "npm.cmd install" (ou TESTAR.bat) e tente de novo.\n'); }

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;
const HEADLESS = process.env.HEADLESS === '1';
const stamp = String(Date.now()).slice(-6);

const browsers = [
  { name: 'Chrome', folder: 'chrome', base: '700000001', paths: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`] },
  { name: 'Edge', folder: 'edge', base: '700000002', paths: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'] },
];

function testCPF(base) {
  const d = base.split('').map(Number);
  for (const size of [9, 10]) d.push(d.slice(0, size).reduce((a, n, i) => a + n * (size + 1 - i), 0) * 10 % 11 % 10);
  return d.join('');
}
const maskCPF = (c) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

after(async () => {
  await query("DELETE FROM patients WHERE name LIKE 'Teste Navegador %'");
  await pool.end();
});

for (const b of browsers) {
  const executablePath = b.paths.find((p) => existsSync(p));
  const skip = !chromium ? 'playwright-core não instalado (rode npm.cmd install)' : !executablePath && `${b.name} não instalado`;
  test(`fluxo completo no ${b.name}`, { skip }, async () => {
    assert.ok(EMAIL && PASSWORD, 'Configure DEMO_ADMIN_EMAIL e DEMO_ADMIN_PASSWORD no .env');
    const shots = `docs/evidencias/${b.folder}`;
    mkdirSync(shots, { recursive: true });
    const browser = await chromium.launch({ executablePath, headless: HEADLESS, slowMo: HEADLESS ? 0 : 120 });
    try {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'pt-BR' });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      const shot = (file) => page.screenshot({ path: `${shots}/${file}.png` });
      const version = browser.version();

      // 1. Tela de login
      await page.goto(BASE);
      await page.locator('#login-view').waitFor();
      assert.equal(await page.locator('.pm-brand-story h2').innerText(), 'Seu estúdio\nem equilíbrio.');
      await shot('01-login');

      // 2. Senha incorreta
      await page.fill('#login-email', EMAIL);
      await page.fill('#login-password', 'senha-incorreta-navegador');
      await page.click('#login-form button[type=submit]');
      await page.locator('#login-error', { hasText: 'E-mail ou senha incorretos' }).waitFor();
      await shot('02-senha-incorreta');

      // 3. Login correto e Visão Geral
      await page.fill('#login-password', PASSWORD);
      await page.click('#login-form button[type=submit]');
      await page.locator('#page-dashboard').waitFor();
      await page.locator('#stat-total', { hasText: /\d+/ }).waitFor();
      await shot('03-visao-geral');

      // 4. Novo paciente (sem consentimento é recusado; com consentimento grava)
      const name = `Teste Navegador ${b.name} ${stamp}`;
      const cpf = testCPF(b.base);
      await page.click('.nav-item[data-page=patients]');
      await page.locator('#patient-rows tr').first().waitFor();
      await page.click('#new-patient');
      await page.fill('#f-name', name);
      await page.fill('#f-cpf', cpf);
      await page.fill('#f-birth', '1993-04-21');
      assert.ok(Number(await page.inputValue('#f-age')) >= 33, 'idade calculada pela data');
      await page.fill('#f-email', `navegador.${b.folder}.${stamp}@example.com`);
      await page.fill('#f-phone', '45991112233');
      assert.equal(await page.inputValue('#f-cpf'), maskCPF(cpf), 'máscara de CPF');
      await page.fill('#f-goals', `Teste automatizado no ${b.name}`);
      await shot('04-ficha-preenchida');
      await page.click('#save-patient');
      await page.locator('#modal-error', { hasText: 'Política de Privacidade' }).waitFor();
      await page.check('#f-consent');
      await page.click('#save-patient');
      await page.locator('#toast', { hasText: 'Paciente cadastrado com sucesso' }).waitFor();
      const row = page.locator('#patient-rows tr', { hasText: name });
      await row.waitFor();
      await shot('05-paciente-na-lista');
      let db = (await query('SELECT cpf, phone, active, privacy_consent_at FROM patients WHERE name=$1', [name])).rows[0];
      assert.equal(db.cpf, cpf);
      assert.equal(db.phone, '45991112233');
      assert.ok(db.privacy_consent_at);

      // 5. Atualizar a página e pesquisar pelo CPF com pontuação
      await page.reload();
      await page.click('.nav-item[data-page=patients]');
      await page.fill('#patient-search', maskCPF(cpf));
      await page.locator('#patient-total', { hasText: '1 resultado' }).waitFor();
      await row.waitFor();
      await shot('06-pesquisa-apos-f5');

      // 6. Editar telefone
      await row.locator('[data-action=edit]').click();
      await page.fill('#f-phone', '45997776655');
      await page.click('#save-patient');
      await page.locator('#toast', { hasText: 'Paciente atualizado' }).waitFor();
      db = (await query('SELECT phone FROM patients WHERE name=$1', [name])).rows[0];
      assert.equal(db.phone, '45997776655');
      await row.locator('[data-action=view]').click();
      await page.locator('.detail-grid', { hasText: '(45) 99777-6655' }).waitFor();
      await shot('07-ficha-editada');
      await page.click('#cancel-modal');

      // 7. Inativar com confirmação e conferir no filtro de inativos
      await row.locator('[data-action=status]').click();
      await page.locator('#confirm-modal').waitFor();
      await shot('08-confirmar-inativacao');
      await page.click('#confirm-modal');
      await page.locator('#toast', { hasText: 'inativado' }).waitFor();
      await page.selectOption('#patient-filter', 'inactive');
      await page.locator('#patient-rows tr', { hasText: name }).locator('.col-status .badge', { hasText: 'Inativo' }).waitFor();
      db = (await query('SELECT active FROM patients WHERE name=$1', [name])).rows[0];
      assert.equal(db.active, false);
      await shot('09-filtro-inativos');

      // 8. Usuários do Sistema (Configurações)
      await page.click('#user-trigger');
      await page.click('#menu-users');
      await page.locator('.user-row', { hasText: EMAIL }).waitFor();
      await shot('10-usuarios-do-sistema');
      await page.click('#close-modal');

      // 9. Modo escuro
      await page.click('.topbar [data-action=toggle-theme]');
      assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
      await shot('11-modo-escuro');
      await page.click('.topbar [data-action=toggle-theme]');

      // 10. Sair
      await page.click('#user-trigger');
      await page.click('#logout-btn');
      await page.locator('#login-view').waitFor();
      const me = await page.evaluate(async () => (await fetch('/api/auth/me')).status);
      assert.equal(me, 401);
      await shot('12-saiu');

      // 11. Layout de celular (375 px)
      const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: 'pt-BR' });
      const phone = await mobile.newPage();
      phone.on('pageerror', (e) => pageErrors.push(e.message));
      await phone.goto(BASE);
      await phone.fill('#login-email', EMAIL);
      await phone.fill('#login-password', PASSWORD);
      await phone.click('#login-form button[type=submit]');
      await phone.locator('#page-dashboard').waitFor();
      await phone.click('#menu-toggle');
      await phone.click('.nav-item[data-page=patients]');
      await phone.locator('#patient-rows tr').first().waitFor();
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, 'sem rolagem lateral no celular');
      await phone.screenshot({ path: `${shots}/13-celular-pacientes.png` });
      await mobile.close();

      assert.deepEqual(pageErrors, [], 'nenhum erro de JavaScript na página');
      console.log(`  ${b.name} ${version}: fluxo completo OK — capturas em ${shots}`);
    } finally {
      await browser.close();
    }
  });
}
