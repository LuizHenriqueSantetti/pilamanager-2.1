// Teste de integração: usa o servidor em execução (http://localhost:3000) e o PostgreSQL real.
// Execute com o sistema iniciado: npm run test:integracao
// Cria apenas registros fictícios com o prefixo "Teste Automatizado" e os remove ao final.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, query } from '../../server/lib/db.js';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD;
const stamp = Date.now();
// CPFs válidos gerados a partir do horário: não colidem com cadastros feitos na tela.
function cpfUnico(prefixo) {
  const d = (prefixo + String(stamp).slice(-8)).split('').map(Number);
  for (const size of [9, 10]) d.push(d.slice(0, size).reduce((a, n, i) => a + n * (size + 1 - i), 0) * 10 % 11 % 10);
  return d.join('');
}
const mascara = (c) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
const cpfFicha = cpfUnico('1');
const cpfDup = cpfUnico('2');
const patientName = `Teste Automatizado ${stamp}`;
const userEmail = `teste.automatizado.${stamp}@pilamanager.local`;

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return { status: res.status, body, cookie, csrf: body.csrf };
}
function client(session) {
  return async (path, { method = 'GET', data } = {}) => {
    const headers = { Cookie: session.cookie };
    if (data) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-CSRF-Token'] = session.csrf;
    const res = await fetch(`${BASE}${path}`, { method, headers, body: data ? JSON.stringify(data) : undefined });
    return { status: res.status, body: await res.json() };
  };
}

after(async () => {
  await query('DELETE FROM patients WHERE name LIKE $1', ['Teste Automatizado %']);
  await query('DELETE FROM users WHERE email LIKE $1', ['teste.automatizado.%@pilamanager.local']);
  await pool.end();
});

test('API responde e está conectada ao PostgreSQL', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('rotas protegidas exigem login', async () => {
  for (const path of ['/api/patients', '/api/users', '/api/auth/me']) {
    assert.equal((await fetch(`${BASE}${path}`)).status, 401, path);
  }
});

test('login recusa senha incorreta e aceita a correta', async () => {
  assert.ok(ADMIN_EMAIL && ADMIN_PASSWORD, 'Configure DEMO_ADMIN_EMAIL e DEMO_ADMIN_PASSWORD no .env');
  const wrong = await login(ADMIN_EMAIL, 'senha-incorreta-teste');
  assert.equal(wrong.status, 401);
  const ok = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, 'GERENCIA');
  assert.match(ok.cookie, /^plm_sid=/);
});

test('fluxo completo de paciente é gravado no PostgreSQL', async () => {
  const api = client(await login(ADMIN_EMAIL, ADMIN_PASSWORD));

  const ficha = { name: patientName, cpf: mascara(cpfFicha), birth_date: '1995-03-10', email: `teste.${stamp}@example.com`,
    phone: '(45) 90000-0000', health_problems: 'Nenhum (dado fictício)', goals: 'Fortalecer o core' };

  const semConsentimento = await api('/api/patients', { method: 'POST', data: ficha });
  assert.equal(semConsentimento.status, 400);

  const created = await api('/api/patients', { method: 'POST', data: { ...ficha, privacy_consent: true } });
  assert.equal(created.status, 201);
  const id = created.body.id;
  let row = (await query('SELECT name, cpf, email, goals, active, privacy_consent_at FROM patients WHERE id=$1', [id])).rows[0];
  assert.equal(row.name, patientName);
  assert.equal(row.cpf, cpfFicha);
  assert.equal(row.goals, 'Fortalecer o core');
  assert.equal(row.active, true);
  assert.ok(row.privacy_consent_at, 'consentimento registrado');

  for (const termo of [String(stamp), `teste.${stamp}@example`, mascara(cpfFicha).slice(0, 11)]) {
    const found = await api(`/api/patients?search=${encodeURIComponent(termo)}`);
    assert.equal(found.body.total, 1, `busca por ${termo}`);
  }

  const edited = await api(`/api/patients/${id}`, { method: 'PATCH', data: { ...ficha, phone: '(45) 91111-1111' } });
  assert.equal(edited.status, 200);
  row = (await query('SELECT phone FROM patients WHERE id=$1', [id])).rows[0];
  assert.equal(row.phone, '45911111111'); // guardado só com dígitos

  const detail = await api(`/api/patients/${id}`);
  assert.equal(detail.body.patient.age >= 30, true);

  const inactive = await api(`/api/patients/${id}/status`, { method: 'PATCH', data: { active: false } });
  assert.equal(inactive.status, 200);
  row = (await query('SELECT active FROM patients WHERE id=$1', [id])).rows[0];
  assert.equal(row.active, false);
});

test('paciente: validações e CPF duplicado', async () => {
  const api = client(await login(ADMIN_EMAIL, ADMIN_PASSWORD));
  const ok = { birth_date: '1990-01-01', email: `dup.${stamp}@example.com`, privacy_consent: true };
  assert.equal((await api('/api/patients', { method: 'POST', data: { ...ok, name: 'ab', cpf: '123.456.789-09' } })).status, 400);
  assert.equal((await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' CPF', cpf: '123.456.789-00' } })).status, 400);
  assert.equal((await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' Sem CPF' } })).status, 400);
  const first = await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' A', cpf: mascara(cpfDup) } });
  assert.equal(first.status, 201);
  const dup = await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' B', cpf: cpfDup } });
  assert.equal(dup.status, 409);
});

test('cadastro de usuário: senha em hash, duplicidade e permissões', async () => {
  const api = client(await login(ADMIN_EMAIL, ADMIN_PASSWORD));
  const password = `Senha-Teste-${stamp}`;
  const created = await api('/api/users', { method: 'POST', data: { name: 'Teste Automatizado', email: userEmail, role: 'PROFISSIONAL', password } });
  assert.equal(created.status, 201);

  const stored = (await query('SELECT password_hash FROM users WHERE email=$1', [userEmail])).rows[0].password_hash;
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(stored.includes(password), false);

  const dup = await api('/api/users', { method: 'POST', data: { name: 'Teste Automatizado', email: userEmail.toUpperCase(), role: 'PROFISSIONAL', password } });
  assert.equal(dup.status, 409);

  const professional = client(await login(userEmail, password));
  assert.equal((await professional('/api/patients')).status, 200);
  assert.equal((await professional('/api/patients', { method: 'POST', data: { name: patientName + ' Indevido' } })).status, 403);
  assert.equal((await professional('/api/users')).status, 403);

  // Desativar a conta derruba a sessão aberta e impede novo login.
  const userId = created.body.user.id;
  assert.equal((await api(`/api/users/${userId}/status`, { method: 'PATCH', data: { active: false } })).status, 200);
  assert.equal((await professional('/api/auth/me')).status, 401);
  assert.equal((await login(userEmail, password)).status, 401);
  assert.equal((await api(`/api/users/${userId}/status`, { method: 'PATCH', data: { active: true } })).status, 200);
  assert.equal((await login(userEmail, password)).status, 200);
});

test('ninguém desativa a própria conta', async () => {
  const session = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const api = client(session);
  const res = await api(`/api/users/${session.body.user.id}/status`, { method: 'PATCH', data: { active: false } });
  assert.equal(res.status, 400);
});

test('logout encerra a sessão no servidor', async () => {
  const session = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const api = client(session);
  assert.equal((await api('/api/auth/me')).status, 200);
  assert.equal((await api('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal((await api('/api/auth/me')).status, 401);
});

test('Meu Perfil e troca de senha ficam gravados no banco', async () => {
  const admin = client(await login(ADMIN_EMAIL, ADMIN_PASSWORD));
  const email = `teste.automatizado.perfil.${stamp}@pilamanager.local`;
  const senha = `Senha-Perfil-${stamp}`;
  assert.equal((await admin('/api/users', { method: 'POST', data: { name: 'Teste Automatizado Perfil', email, role: 'RECEPCIONISTA', password: senha } })).status, 201);
  const pessoa = client(await login(email, senha));
  const novoEmail = `teste.automatizado.novo.${stamp}@pilamanager.local`;
  assert.equal((await pessoa('/api/auth/me', { method: 'PATCH', data: { name: 'Teste Automatizado Editado', email: novoEmail } })).status, 200);
  assert.equal((await query('SELECT name FROM users WHERE email=$1', [novoEmail])).rows[0].name, 'Teste Automatizado Editado');
  assert.equal((await pessoa('/api/auth/me', { method: 'PATCH', data: { name: 'Teste', email: ADMIN_EMAIL } })).status, 409);
  assert.equal((await pessoa('/api/auth/password', { method: 'POST', data: { current_password: 'senha-errada-0000', new_password: 'Nova-Senha-Forte-2026' } })).status, 400);
  assert.equal((await pessoa('/api/auth/password', { method: 'POST', data: { current_password: senha, new_password: 'curta' } })).status, 400);
  assert.equal((await pessoa('/api/auth/password', { method: 'POST', data: { current_password: senha, new_password: 'Nova-Senha-Forte-2026' } })).status, 200);
  assert.equal((await login(novoEmail, senha)).status, 401);
  assert.equal((await login(novoEmail, 'Nova-Senha-Forte-2026')).status, 200);
});

test('excluir paciente: só Gerência e Administrador', async () => {
  const admin = client(await login(ADMIN_EMAIL, ADMIN_PASSWORD));
  // CPF válido gerado a partir do horário, para não colidir com cadastros existentes.
  const d = ('3' + String(stamp).slice(-8)).split('').map(Number);
  for (const size of [9, 10]) d.push(d.slice(0, size).reduce((a, n, i) => a + n * (size + 1 - i), 0) * 10 % 11 % 10);
  const res = await admin('/api/patients', { method: 'POST', data: { name: `${patientName} Excluir`, cpf: d.join(''), birth_date: '1990-01-01', email: `excluir.${stamp}@example.com`, privacy_consent: true } });
  assert.equal(res.status, 201);
  const id = res.body.id;
  const email = `teste.automatizado.recep.${stamp}@pilamanager.local`;
  await admin('/api/users', { method: 'POST', data: { name: 'Teste Automatizado Recepção', email, role: 'RECEPCIONISTA', password: `Senha-Recep-${stamp}` } });
  const recep = client(await login(email, `Senha-Recep-${stamp}`));
  assert.equal((await recep(`/api/patients/${id}`, { method: 'DELETE' })).status, 403);
  assert.equal((await admin(`/api/patients/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await query('SELECT 1 FROM patients WHERE id=$1', [id])).rowCount, 0);
});

test('o servidor não entrega arquivos fora da pasta das telas', async () => {
  assert.equal((await fetch(`${BASE}/assets/js/app.js`)).status, 200);
  for (const caminho of ['/%2e%2e/server/lib/config.js', '/..%2f.env', '/.env', '/assets/../../package.json']) {
    const res = await fetch(`${BASE}${caminho}`);
    assert.notEqual(res.status, 200, caminho);
  }
});
