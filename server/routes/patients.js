import { query } from '../lib/db.js';
import { getSession, requireLogin, requireCSRF } from '../lib/auth.js';
import { json, error, readJSON } from '../lib/http.js';
import { makeId } from '../lib/security.js';
import { validatePatient, patientTextFields } from '../lib/validation.js';

const canEdit = ['GERENCIA','ADMINISTRADOR','RECEPCIONISTA'];
const canDelete = ['GERENCIA','ADMINISTRADOR'];
const textColumns = Object.keys(patientTextFields);
// Colunas gravadas a partir do formulário (mesma ordem em INSERT e UPDATE).
const formColumns = ['name','cpf','birth_date','email','phone',...textColumns];
const columns = `p.id, p.name, p.cpf, TO_CHAR(p.birth_date,'YYYY-MM-DD') AS birth_date,
  DATE_PART('year', AGE(CURRENT_DATE, p.birth_date))::int AS age,
  p.phone, p.email, ${textColumns.map(c => 'p.'+c).join(', ')}, p.active,
  p.privacy_consent_at, p.created_at, p.updated_at`;
const isUUID = str => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
const duplicateMessage = e => e.code === '23505' ? 'Já existe um paciente com este CPF.' : null;

// Totais e aniversários para a Visão Geral.
async function summary() {
  const { rows: [counts] } = await query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE active)::int AS active, COUNT(*) FILTER (WHERE NOT active)::int AS inactive FROM patients`);
  const { rows } = await query(`SELECT id, name, TO_CHAR(birth_date,'YYYY-MM-DD') AS birth_date FROM patients
      WHERE active AND birth_date IS NOT NULL LIMIT 2000`);
  const { rows: recent } = await query(`SELECT id, name, email, created_at FROM patients ORDER BY created_at DESC LIMIT 5`);
  const today = new Date(); today.setHours(0,0,0,0);
  const people = rows.map(p => {
    const [y, m, d] = p.birth_date.split('-').map(Number);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
    return { id: p.id, name: p.name, month: m, day: d, turning: next.getFullYear() - y,
      next: next.toISOString().slice(0,10), daysUntil: Math.round((next - today) / 86400000) };
  });
  return {
    ...counts,
    birthdaysThisMonth: people.filter(p => p.month === today.getMonth() + 1).sort((a,b) => a.day - b.day).slice(0, 6),
    upcomingBirthdays: [...people].sort((a,b) => a.daysUntil - b.daysUntil).slice(0, 3),
    recent,
  };
}

export async function handlePatients(req,res,path,url) {
  const session = await getSession(req);
  if (!requireLogin(res,session)) return;
  if (req.method!=='GET') {
    if (!requireLogin(res,session,canEdit) || !requireCSRF(req,res,session)) return;
  }
  if (req.method==='GET' && path==='/api/patients/summary') return json(res,200,await summary());

  if (req.method==='GET' && path==='/api/patients') {
    const search = (url.searchParams.get('search')||'').trim().slice(0,100);
    const status = url.searchParams.get('status') || 'all';
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '1',10) || 1));
    // Até 500 por página para as telas que precisam da lista completa (agenda, cobranças, relatórios).
    const perPage = Math.max(1, Math.min(500, Number.parseInt(url.searchParams.get('per_page') || '20',10) || 20));
    if (!['active','inactive','all'].includes(status)) return error(res,400,'Filtro inválido.');
    const filters=[];const params=[];
    if (search) {
      // Nome ou e-mail por trecho; CPF pelos dígitos (aceita busca com ou sem pontuação).
      params.push('%'+search+'%');
      const parts = [`p.name ILIKE $${params.length}`, `p.email ILIKE $${params.length}`];
      const cpfDigits = search.replace(/\D/g,'');
      if (cpfDigits.length >= 3) { params.push('%'+cpfDigits+'%'); parts.push(`p.cpf LIKE $${params.length}`); }
      filters.push(`(${parts.join(' OR ')})`);
    }
    if (status !== 'all') { params.push(status==='active'); filters.push(`p.active=$${params.length}`); }
    const where = filters.length ? 'WHERE '+filters.join(' AND ') : '';
    const resultCount = await query(`SELECT COUNT(*)::integer AS count FROM patients p ${where}`,params);
    params.push(perPage); params.push((page-1)*perPage);
    const { rows } = await query(`SELECT ${columns} FROM patients p ${where} ORDER BY p.created_at DESC,p.name LIMIT $${params.length-1} OFFSET $${params.length}`,params);
    return json(res,200,{ items:rows,total:resultCount.rows[0].count,page,pages:Math.max(1,Math.ceil(resultCount.rows[0].count/perPage)) });
  }

  if (req.method==='POST' && path==='/api/patients') {
    const { errors,value }=validatePatient(await readJSON(req), { requireConsent: true });
    if(errors.length) return error(res,400,errors.join(' '));
    const values = formColumns.map(c => value[c]);
    try {
      const { rows } = await query(`INSERT INTO patients(id,${formColumns.join(',')},privacy_consent_at,created_by)
        VALUES ($1,${formColumns.map((_,i)=>'$'+(i+2)).join(',')},NOW(),$${formColumns.length+2}) RETURNING id`,
        [makeId(),...values,session.id]);
      return json(res,201,{ id:rows[0].id });
    } catch(e){ const msg=duplicateMessage(e); if(msg) return error(res,409,msg); throw e; }
  }

  const m=path.match(/^\/api\/patients\/([0-9a-f-]+)(?:\/(status))?$/i);
  if(!m || !isUUID(m[1])) return error(res,404,'Paciente não encontrado.');
  const id=m[1];
  if(req.method==='GET' && !m[2]) {
    const {rows}=await query(`SELECT ${columns} FROM patients p WHERE p.id=$1`,[id]);
    return rows[0] ? json(res,200,{ patient:rows[0] }) : error(res,404,'Paciente não encontrado.');
  }
  if(req.method==='DELETE' && !m[2]) {
    if (!requireLogin(res,session,canDelete)) return;
    const {rowCount}=await query('DELETE FROM patients WHERE id=$1',[id]);
    return rowCount ? json(res,200,{success:true}) : error(res,404,'Paciente não encontrado.');
  }
  if(req.method==='PATCH' && m[2]==='status') {
    const {active}=await readJSON(req);
    if(typeof active!=='boolean') return error(res,400,'Situação inválida.');
    const {rows}=await query('UPDATE patients SET active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,active',[active,id]);
    return rows[0] ? json(res,200,{patient:rows[0]}) : error(res,404,'Paciente não encontrado.');
  }
  if(req.method==='PATCH' && !m[2]) {
    const { errors,value }=validatePatient(await readJSON(req));
    if(errors.length) return error(res,400,errors.join(' '));
    const sets = formColumns.map((c,i)=>`${c}=$${i+1}`).join(',');
    try {
      const {rows}=await query(`UPDATE patients SET ${sets},updated_at=NOW() WHERE id=$${formColumns.length+1} RETURNING id`,
        [...formColumns.map(c => value[c]),id]);
      return rows[0] ? json(res,200,{id:rows[0].id}):error(res,404,'Paciente não encontrado.');
    } catch(e){ const msg=duplicateMessage(e); if(msg) return error(res,409,msg); throw e; }
  }
  return error(res,405,'Método não permitido.');
}
