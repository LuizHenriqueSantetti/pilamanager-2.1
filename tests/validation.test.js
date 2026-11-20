import test from 'node:test';
import assert from 'node:assert/strict';
import { validCPF,validatePatient,validateUser,normalizeEmail } from '../server/lib/validation.js';

const base = { name:'Ana Demo', cpf:'529.982.247-25', birth_date:'1990-05-14', email:'ana.demo@example.com' };

test('aceita CPF de teste e rejeita dígitos inválidos',()=>{
 assert.equal(validCPF('529.982.247-25'),true);
 assert.equal(validCPF('529.982.247-26'),false);
 assert.equal(validCPF('111.111.111-11'),false);
});
test('paciente exige nome, CPF, data de nascimento e e-mail (como no original)',()=>{
 const r=validatePatient({name:'Paciente Demonstração'});
 assert.equal(r.errors.length,3);
 assert.deepEqual(validatePatient(base).errors,[]);
});
test('paciente rejeita CPF inválido, e-mail inadequado e data futura',()=>{
 const r=validatePatient({...base,cpf:'000.000.000-00',email:'invalido',birth_date:'2999-01-01'});
 assert.equal(r.errors.length,3);
});
test('cadastro novo exige aceite da Política de Privacidade',()=>{
 assert.equal(validatePatient(base,{requireConsent:true}).errors.length,1);
 assert.deepEqual(validatePatient({...base,privacy_consent:true},{requireConsent:true}).errors,[]);
});
test('telefone do paciente é guardado só com dígitos e exige DDD',()=>{
 assert.equal(validatePatient({...base,phone:'(45) 99999-0001'}).value.phone,'45999990001');
 assert.equal(validatePatient({...base,phone:'9999-0001'}).errors.length,1);
});
test('campos da ficha são aparados e limitados a 2000 caracteres',()=>{
 const ok=validatePatient({...base,goals:'  Melhorar postura  ',disabilities:''});
 assert.equal(ok.value.goals,'Melhorar postura');
 assert.equal(ok.value.disabilities,null);
 assert.equal(validatePatient({...base,health_problems:'x'.repeat(2001)}).errors.length,1);
});
test('normaliza e valida usuário',()=>{
 const r=validateUser({name:'Fulana Demo',email:'  Demo@EXEMPLO.COM  ',role:'GERENCIA',password:'senha-segura-123'});
 assert.deepEqual(r.errors,[]);
 assert.equal(r.value.email,'demo@exemplo.com');
 assert.equal(normalizeEmail(' X@Y.COM '),'x@y.com');
});
test('não permite definir cargo arbitrário ou senha curta',()=>{
 const r=validateUser({name:'Teste Aluno',email:'teste@exemplo.com',role:'SUPER_ADMIN',password:'123'});
 assert.ok(r.errors.length>=2);
});
