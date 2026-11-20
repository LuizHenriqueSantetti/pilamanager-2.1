// Cria a conta da Gerência (a partir do .env) e três pacientes de exemplo (dados fictícios).
// Pode rodar várias vezes: não duplica registros.
import { pool,query } from '../server/lib/db.js';
import { makeId,hashPassword } from '../server/lib/security.js';
import { normalizeEmail,emailValid } from '../server/lib/validation.js';

// Gera um CPF com dígitos verificadores válidos a partir de 9 dígitos (somente para teste).
function testCPF(base) {
  const d = base.split('').map(Number);
  for (const size of [9, 10]) {
    const sum = d.slice(0, size).reduce((acc, n, i) => acc + n * (size + 1 - i), 0);
    d.push((sum * 10) % 11 % 10);
  }
  return d.join('');
}

const pacientesExemplo = [
  { name:'Ana Beatriz Souza', cpf:testCPF('900000001'), email:'ana.souza@example.com', birth_date:'1991-11-27', phone:'45990000001', goals:'Melhorar a postura.' },
  { name:'Carlos Eduardo Lima', cpf:testCPF('900000002'), email:'carlos.lima@example.com', birth_date:'1986-12-03', phone:'45990000002', goals:'Reduzir dores lombares.' },
  { name:'Juliana Martins', cpf:testCPF('900000003'), email:'juliana.martins@example.com', birth_date:'1999-01-15', phone:'45990000003', goals:'Ganhar flexibilidade.' },
];

try{
 const email=normalizeEmail(process.env.DEMO_ADMIN_EMAIL);
 const password=process.env.DEMO_ADMIN_PASSWORD||'';
 if(!emailValid(email)||password.length<12||password.includes('defina-uma-senha'))throw new Error('Defina DEMO_ADMIN_EMAIL e DEMO_ADMIN_PASSWORD no arquivo .env.');
 const result=await query('SELECT id FROM users WHERE email=$1',[email]);
 let userId=result.rows[0]?.id;
 if(!userId){
   userId=makeId();
   const hash=await hashPassword(password);
   await query(`INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'GERENCIA')`,[userId,process.env.DEMO_ADMIN_NAME||'Gerência',email,hash]);
   console.log('Conta da Gerência criada:',email);
 } else console.log('Conta da Gerência já existe:',email);

 for(const p of pacientesExemplo){
   const {rowCount}=await query('SELECT 1 FROM patients WHERE cpf=$1',[p.cpf]);
   if(!rowCount) {
     await query(`INSERT INTO patients(id,name,cpf,email,birth_date,phone,goals,privacy_consent_at,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,[makeId(),p.name,p.cpf,p.email,p.birth_date,p.phone,p.goals,userId]);
   }
 }
 console.log('Pacientes de exemplo conferidos.');
}catch(e){console.error('Erro no seed:',e.message);process.exitCode=1}
finally{await pool.end()}
