import { query } from '../lib/db.js';
import { getSession, requireLogin, requireCSRF } from '../lib/auth.js';
import { cookieValue, clearSessionCookie, setSessionCookie, json, error, readJSON, publicUser } from '../lib/http.js';
import { digest, makeId, makeToken, verifyPassword, hashPassword } from '../lib/security.js';
import { normalizeEmail, emailValid } from '../lib/validation.js';
import { config } from '../lib/config.js';

// IP de quem está acessando. Atrás do proxy do Render usa o último endereço do X-Forwarded-For,
// que é o colocado pelo próprio proxy (os anteriores podem ser forjados pelo visitante).
function clientAddress(req) {
  if (config.trustProxy) {
    const chain = String(req.headers['x-forwarded-for'] ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (chain.length) return chain[chain.length - 1];
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export async function handleAuth(req, res, path) {
  if (req.method === 'POST' && path === '/api/auth/login') {
    const body = await readJSON(req);
    const email = normalizeEmail(body.email);
    const password = body.password;
    if (!emailValid(email) || typeof password !== 'string' || password.length > 128) return error(res, 400, 'Informe e-mail e senha válidos.');
    const remote = clientAddress(req);
    const identifier = digest(email + ':' + remote);
    const { rows: [{ count }] } = await query(`SELECT COUNT(*)::integer AS count FROM login_attempts WHERE identifier=$1 AND attempted_at > NOW() - INTERVAL '15 minutes'`, [identifier]);
    if (count >= 5) return error(res, 429, 'Muitas tentativas. Tente novamente em 15 minutos.');
    const { rows } = await query('SELECT * FROM users WHERE email=$1 AND active=TRUE', [email]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await query('INSERT INTO login_attempts (identifier) VALUES ($1)', [identifier]);
      return error(res, 401, 'E-mail ou senha incorretos.');
    }
    await query('DELETE FROM login_attempts WHERE identifier=$1', [identifier]);
    const token = makeToken();
    const csrf = digest('csrf:' + token);
    await query(`INSERT INTO sessions (id,user_id,token_hash,csrf_hash,expires_at)
      VALUES ($1,$2,$3,$4,NOW() + INTERVAL '8 hours')`, [makeId(), user.id, digest(token), digest(csrf)]);
    setSessionCookie(res, token);
    return json(res, 200, { user: publicUser(user), csrf });
  }

  if (req.method === 'GET' && path === '/api/auth/me') {
    const session = await getSession(req);
    if (!requireLogin(res, session)) return;
    const sid = cookieValue(req, 'plm_sid');
    return json(res, 200, { user: publicUser(session), csrf: digest('csrf:' + sid) });
  }

  if (req.method === 'POST' && path === '/api/auth/logout') {
    const session = await getSession(req);
    if (!requireLogin(res, session) || !requireCSRF(req,res,session)) return;
    await query('DELETE FROM sessions WHERE id=$1', [session.session_id]);
    clearSessionCookie(res);
    return json(res,200,{ success:true });
  }

  // Meu Perfil: a própria pessoa altera nome e e-mail (gravado no PostgreSQL).
  if (req.method === 'PATCH' && path === '/api/auth/me') {
    const session = await getSession(req);
    if (!requireLogin(res, session) || !requireCSRF(req, res, session)) return;
    const body = await readJSON(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const newEmail = normalizeEmail(body.email);
    if (name.length < 3 || name.length > 120) return error(res, 400, 'Informe um nome entre 3 e 120 caracteres.');
    if (!emailValid(newEmail)) return error(res, 400, 'Informe um e-mail válido.');
    try {
      const { rows } = await query('UPDATE users SET name=$1, email=$2, updated_at=NOW() WHERE id=$3 RETURNING id,name,email,role,active', [name, newEmail, session.id]);
      return json(res, 200, { user: publicUser(rows[0]) });
    } catch (e) {
      if (e.code === '23505') return error(res, 409, 'Este e-mail já está cadastrado.');
      throw e;
    }
  }

  // Segurança: troca de senha conferindo a senha atual. Encerra as outras sessões abertas.
  if (req.method === 'POST' && path === '/api/auth/password') {
    const session = await getSession(req);
    if (!requireLogin(res, session) || !requireCSRF(req, res, session)) return;
    const { current_password: current, new_password: next } = await readJSON(req);
    if (typeof current !== 'string' || typeof next !== 'string') return error(res, 400, 'Informe a senha atual e a nova senha.');
    if (next.length < 12 || next.length > 128) return error(res, 400, 'A nova senha precisa ter entre 12 e 128 caracteres.');
    if (next === current) return error(res, 400, 'A nova senha precisa ser diferente da atual.');
    const { rows: [user] } = await query('SELECT password_hash FROM users WHERE id=$1', [session.id]);
    if (!user || !(await verifyPassword(current, user.password_hash))) return error(res, 400, 'Senha atual incorreta.');
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [await hashPassword(next), session.id]);
    await query('DELETE FROM sessions WHERE user_id=$1 AND id<>$2', [session.id, session.session_id]);
    return json(res, 200, { success: true });
  }
  return error(res, 404, 'Rota não encontrada.');
}
