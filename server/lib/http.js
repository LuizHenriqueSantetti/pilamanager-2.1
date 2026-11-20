import { config } from './config.js';
export const json = (res, status, data, headers={}) => {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers });
  res.end(JSON.stringify(data));
};
export const error = (res, status, message) => json(res, status, { error: message });
export async function readJSON(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('Envie JSON.'), { status: 415 });
  let total = 0, chunks=[];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 16 * 1024) throw Object.assign(new Error('Dados enviados ultrapassam o limite.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const obj = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!obj || Array.isArray(obj) || typeof obj !== 'object') throw new Error();
    return obj;
  } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
export function cookieValue(req, name) {
  const header = req.headers.cookie ?? '';
  const pair = header.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return pair ? decodeURIComponent(pair.slice(name.length+1)) : null;
}
export function setSessionCookie(res, token) {
  const flags = ['Path=/','HttpOnly','SameSite=Strict','Max-Age=28800'];
  if (config.cookieSecure) flags.push('Secure');
  res.setHeader('Set-Cookie', 'plm_sid='+encodeURIComponent(token)+'; '+flags.join('; '));
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'plm_sid=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(config.cookieSecure ? '; Secure':''));
}
export function enforceOrigin(req) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return true;
  // Browser requests with an Origin header must be same-origin.
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients still need a valid session + CSRF token
  const host = req.headers.host;
  try {
    const target = new URL(origin);
    const protocol = config.cookieSecure ? 'https:' : 'http:';
    return target.host === host && target.protocol === protocol;
  } catch { return false; }
}
export function publicUser(row) { return { id:row.id, name:row.name, email:row.email, role:row.role, active:row.active }; }
