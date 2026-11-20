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

  const ficha = { name: patientName, cpf: '987.654.321-00', birth_date: '1995-03-10', email: `teste.${stamp}@example.com`,
    phone: '(45) 90000-0000', health_problems: 'Nenhum (dado fictício)', goals: 'Fortalecer o core' };

  const semConsentimento = await api('/api/patients', { method: 'POST', data: ficha });
  assert.equal(semConsentimento.status, 400);

  const created = await api('/api/patients', { method: 'POST', data: { ...ficha, privacy_consent: true } });
  assert.equal(created.status, 201);
  const id = created.body.id;
  let row = (await query('SELECT name, cpf, email, goals, active, privacy_consent_at FROM patients WHERE id=$1', [id])).rows[0];
  assert.equal(row.name, patientName);
  assert.equal(row.cpf, '98765432100');
  assert.equal(row.goals, 'Fortalecer o core');
  assert.equal(row.active, true);
  assert.ok(row.privacy_consent_at, 'consentimento registrado');

  for (const termo of [String(stamp), `teste.${stamp}@example`, '987.654.321']) {
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
  const first = await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' A', cpf: '123.456.789-09' } });
  assert.equal(first.status, 201);
  const dup = await api('/api/patients', { method: 'POST', data: { ...ok, name: patientName + ' B', cpf: '12345678909' } });
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
