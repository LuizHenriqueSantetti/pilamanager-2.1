import { query } from './db.js';
import { cookieValue, error } from './http.js';
import { digest, secureEqual } from './security.js';
export async function getSession(req) {
  const token = cookieValue(req,'plm_sid');
  if (!token || token.length > 128) return null;
  const result = await query(`SELECT s.id AS session_id, s.csrf_hash, s.expires_at, u.id, u.name, u.email, u.role, u.active
     FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.active=TRUE`, [digest(token)]);
  return result.rows[0] ?? null;
}
export function requireLogin(res, session, roles=null) {
  if (!session) { error(res,401,'Faça login para continuar.'); return false; }
  if (roles && !roles.includes(session.role)) { error(res,403,'Você não tem permissão para esta ação.'); return false; }
  return true;
}
export function requireCSRF(req,res,session) {
  if (!secureEqual(session.csrf_hash,digest(req.headers['x-csrf-token'] ?? ''))) {
    error(res,403,'Sessão inválida. Atualize a página e tente novamente.'); return false;
  }
  return true;
}
