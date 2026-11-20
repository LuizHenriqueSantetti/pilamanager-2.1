// Cria a conta da Gerência (a partir do .env) e três pacientes fictícios de exemplo.
// Pode rodar várias vezes: não duplica registros e só preenche campos vazios.
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

const demoPatients = [
  { name:'Paciente Demonstração A', cpf:testCPF('900000001'), email:'paciente.a@example.com', birth_date:'1991-11-27', phone:'45990000001', goals:'Melhorar a postura.' },
  { name:'Paciente Demonstração B', cpf:testCPF('900000002'), email:'paciente.b@example.com', birth_date:'1986-12-03', phone:'45990000002', goals:'Reduzir dores lombares.' },
  { name:'Paciente Demonstração C', cpf:testCPF('900000003'), email:'paciente.c@example.com', birth_date:'1999-01-15', phone:'45990000003', goals:'Ganhar flexibilidade.' },
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
   await query(`INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,'GERENCIA')`,[userId,process.env.DEMO_ADMIN_NAME||'Gerência Demonstração',email,hash]);
   console.log('Usuário de demonstração criado:',email);
 } else console.log('Usuário de demonstração já existe:',email);

 for(const p of demoPatients){
   const {rowCount}=await query('SELECT 1 FROM patients WHERE name=$1',[p.name]);
   if(!rowCount) {
     await query(`INSERT INTO patients(id,name,cpf,email,birth_date,phone,goals,privacy_consent_at,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,[makeId(),p.name,p.cpf,p.email,p.birth_date,p.phone,p.goals,userId]);
   } else {
     // Completa registros criados por versões antigas do seed, sem sobrescrever o que já existe.
     await query(`UPDATE patients SET cpf=COALESCE(cpf,$2), email=COALESCE(email,$3), birth_date=COALESCE(birth_date,$4),
       phone=COALESCE(phone,$5), goals=COALESCE(goals,$6)
       WHERE name=$1 AND (cpf IS NULL OR email IS NULL OR birth_date IS NULL)
         AND NOT EXISTS (SELECT 1 FROM patients o WHERE o.cpf=$2 AND o.name<>$1)`,[p.name,p.cpf,p.email,p.birth_date,p.phone,p.goals]);
   }
 }
 console.log('Dados fictícios conferidos.');
}catch(e){console.error('Erro no seed:',e.message);process.exitCode=1}
finally{await pool.end()}
