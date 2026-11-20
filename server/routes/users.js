import { query } from '../lib/db.js';
import { getSession, requireLogin, requireCSRF } from '../lib/auth.js';
import { json, error, readJSON, publicUser } from '../lib/http.js';
import { makeId, hashPassword } from '../lib/security.js';
import { validateUser } from '../lib/validation.js';
const admins = ['GERENCIA','ADMINISTRADOR'];

export async function handleUsers(req,res,path) {
  const session = await getSession(req);
  if (!requireLogin(res,session,admins)) return;
  if (req.method === 'GET' && path === '/api/users') {
    const { rows } = await query('SELECT id,name,email,role,active,created_at FROM users ORDER BY created_at DESC LIMIT 100');
    return json(res,200,{ items:rows });
  }
  if (req.method === 'POST' && path === '/api/users') {
    if (!requireCSRF(req,res,session)) return;
    const { errors, value } = validateUser(await readJSON(req));
    if (value.role === 'GERENCIA' && session.role !== 'GERENCIA') errors.push('Somente a gerência pode cadastrar outra gerência.');
    if (errors.length) return error(res,400,errors.join(' '));
    const hash = await hashPassword(value.password);
    try {
      const { rows }=await query('INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,active', [makeId(),value.name,value.email,hash,value.role]);
      return json(res,201,{ user:publicUser(rows[0]) });
    } catch(e) {
      if(e.code==='23505') return error(res,409,'Este e-mail já está cadastrado.');
      throw e;
    }
  }
  const statusRoute = path.match(/^\/api\/users\/([0-9a-f-]{36})\/status$/i);
  if (req.method === 'PATCH' && statusRoute) {
    if (!requireCSRF(req,res,session)) return;
    const { active } = await readJSON(req);
    if (typeof active !== 'boolean') return error(res,400,'Situação inválida.');
    const id = statusRoute[1].toLowerCase();
    if (id === session.id) return error(res,400,'Você não pode desativar a própria conta.');
    const { rows: [target] } = await query('SELECT id, role FROM users WHERE id=$1',[id]);
    if (!target) return error(res,404,'Usuário não encontrado.');
    if (target.role === 'GERENCIA' && session.role !== 'GERENCIA') return error(res,403,'Somente a gerência pode alterar outra gerência.');
    const { rows } = await query('UPDATE users SET active=$1, updated_at=NOW() WHERE id=$2 RETURNING id,name,email,role,active',[active,id]);
    if (!active) await query('DELETE FROM sessions WHERE user_id=$1',[id]); // encerra acessos abertos
    return json(res,200,{ user:publicUser(rows[0]) });
  }
  return error(res,404,'Rota não encontrada.');
}
