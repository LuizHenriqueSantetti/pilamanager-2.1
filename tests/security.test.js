import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,digest,makeToken,secureEqual} from '../server/lib/security.js';
test('senha é hash scrypt e verificada com sucesso', async()=>{
 const hash=await hashPassword('senha-forte-para-testes');
 assert.ok(hash.startsWith('scrypt$'));
 assert.equal(hash.includes('senha-forte-para-testes'),false);
 assert.equal(await verifyPassword('senha-forte-para-testes',hash),true);
 assert.equal(await verifyPassword('errada',hash),false);
});
test('sessões usam tokens fortes e resumo SHA-256',()=>{
 const a=makeToken(),b=makeToken();
 assert.notEqual(a,b);
 assert.equal(digest(a).length,64);
 assert.equal(secureEqual(digest(a),digest(a)),true);
 assert.equal(secureEqual(digest(a),digest(b)),false);
});
