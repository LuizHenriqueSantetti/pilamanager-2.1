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
const files = new Map([
  ['/',['index.html','text/html; charset=utf-8']],
  ['/assets/styles.css',['assets/styles.css','text/css; charset=utf-8']],
  ['/assets/app.js',['assets/app.js','text/javascript; charset=utf-8']]
]);

const server = http.createServer(async(req,res)=>{
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  // Na internet (HTTPS) o navegador passa a usar sempre conexão segura com o site.
  if (config.cookieSecure) res.setHeader('Strict-Transport-Security','max-age=31536000');
  try {
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    const pathname=url.pathname;
    if (!enforceOrigin(req)) return error(res,403,'Origem não autorizada.');
    if (pathname==='/api/health' && req.method==='GET') {
      await query('SELECT 1');
      return res.writeHead(200,{'Content-Type':'application/json'}).end('{"status":"ok"}');
    }
    if (pathname.startsWith('/api/auth/')) return await handleAuth(req,res,pathname);
    if (pathname.startsWith('/api/users')) return await handleUsers(req,res,pathname);
    if (pathname.startsWith('/api/patients')) return await handlePatients(req,res,pathname,url);
    if(req.method!=='GET' && req.method!=='HEAD') return error(res,405,'Método não permitido.');
    const file=files.get(pathname);
    if(!file) return error(res,404,'Página não encontrada.');
    const content=await readFile(path.join(root,file[0]));
    res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-cache'});
    return res.end(req.method==='HEAD'?undefined:content);
  } catch(e) {
    if(e.status) return error(res,e.status,e.message);
    console.error('Falha na requisição:',e);
    return error(res,500,'Não foi possível concluir a operação.');
  }
});
server.listen(config.port,()=>console.log(`PilaManager Demo iniciado em http://localhost:${config.port}`));
process.on('SIGTERM', async()=>{server.close();await pool.end();process.exit(0)});
