import { query } from '../lib/db.js';
import { getSession, requireLogin, requireCSRF } from '../lib/auth.js';
import { cookieValue, clearSessionCookie, setSessionCookie, json, error, readJSON, publicUser } from '../lib/http.js';
import { digest, makeId, makeToken, verifyPassword } from '../lib/security.js';
import { normalizeEmail, emailValid } from '../lib/validation.js';

export async function handleAuth(req, res, path) {
  if (req.method === 'POST' && path === '/api/auth/login') {
    const body = await readJSON(req);
    const email = normalizeEmail(body.email);
    const password = body.password;
    if (!emailValid(email) || typeof password !== 'string' || password.length > 128) return error(res, 400, 'Informe e-mail e senha válidos.');
    const remote = req.socket.remoteAddress ?? 'unknown';
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
  return error(res, 404, 'Rota não encontrada.');
}
