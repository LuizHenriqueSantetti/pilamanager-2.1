import pg from 'pg';
import { config } from './config.js';

function poolOptions() {
  const base = { max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 };
  if (!config.databaseUrl) return { ...base, ...config.db };
  // Banco na internet: conexão sempre criptografada e com o certificado do servidor conferido.
  const url = new URL(config.databaseUrl);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('channel_binding');
  return { ...base, connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
}

export const pool = new pg.Pool(poolOptions());
pool.on('error', error => console.error('Erro de conexão PostgreSQL:', error.message));
export const query = (sql, params = []) => pool.query(sql, params);
