import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from './lib/config.js';
import { pool, query } from './lib/db.js';
import { error, enforceOrigin } from './lib/http.js';
import { handleAuth } from './routes/auth.js';
import { handleUsers } from './routes/users.js';
import { handlePatients } from './routes/patients.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Entrega os arquivos da pasta public, sem permitir sair dela (ex.: /../server).
async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  const type = types[path.extname(file).toLowerCase()];
  if (!type || (file !== root && !file.startsWith(root + path.sep))) return error(res, 404, 'Página não encontrada.');
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    return res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    return error(res, 404, 'Página não encontrada.');
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Na internet (HTTPS) o navegador passa a usar sempre conexão segura com o site.
  if (config.cookieSecure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    if (!enforceOrigin(req)) return error(res, 403, 'Origem não autorizada.');
    if (pathname === '/api/health' && req.method === 'GET') {
      await query('SELECT 1');
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}');
    }
    if (pathname.startsWith('/api/auth/')) return await handleAuth(req, res, pathname);
    if (pathname.startsWith('/api/users')) return await handleUsers(req, res, pathname);
    if (pathname.startsWith('/api/patients')) return await handlePatients(req, res, pathname, url);
    if (pathname.startsWith('/api/')) return error(res, 404, 'Rota não encontrada.');
    if (req.method !== 'GET' && req.method !== 'HEAD') return error(res, 405, 'Método não permitido.');
    return await serveStatic(req, res, pathname);
  } catch (e) {
    if (e.status) return error(res, e.status, e.message);
    console.error('Falha na requisição:', e);
    return error(res, 500, 'Não foi possível concluir a operação.');
  }
});
server.listen(config.port, () => console.log(`PilaManager iniciado em http://localhost:${config.port}`));
process.on('SIGTERM', async () => { server.close(); await pool.end(); process.exit(0); });
