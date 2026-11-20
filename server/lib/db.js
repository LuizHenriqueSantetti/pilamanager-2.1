import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ ...config.db, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 6_000 });
pool.on('error', error => console.error('Erro de conexão PostgreSQL:', error.message));
export const query = (sql, params = []) => pool.query(sql, params);
