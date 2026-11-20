import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../server/lib/db.js';
try {
  const client=await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(filename varchar(180) PRIMARY KEY, applied_at timestamptz DEFAULT NOW() NOT NULL)');
    const files=(await readdir(resolve('db'))).filter(name=>/^\d+_.+\.sql$/.test(name)).sort();
    for(const name of files){
      const {rowCount}=await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[name]);
      if(rowCount) continue;
      console.log('Aplicando migration:',name);
      await client.query('BEGIN');
      try {
        await client.query(await readFile(resolve('db',name),'utf8'));
        await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[name]);
        await client.query('COMMIT');
      }catch(err){await client.query('ROLLBACK');throw err;}
    }
    console.log('Banco de dados atualizado.');
  } finally{client.release()}
} catch(error){console.error('Erro na migration:',error.message);process.exitCode=1}
finally{await pool.end()}
