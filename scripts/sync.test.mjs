import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createDecipheriv} from 'node:crypto';
import {schoolRows,reconcile,validateSchools,mergeSource,faJobs,relevant} from './sync-lib.mjs';
import {alertJobs,encryptFeed} from './gmail-lib.mjs';
test('School IDs retain local history; absence is archived and reappearance restores it',()=>{
 const old=[{id:'8000013',name:'Anterior'}],current=[{id:'8000049',name:'Nova'}];
 const result=reconcile(old,current);assert.deepEqual(result.archived,old);assert.equal(result.added.length,1);
 assert.equal(reconcile(current,old,result.archived).archived.some(x=>x.id==='8000013'),false);
 assert.throws(()=>validateSchools(current,old));
});
test('Official nature, infant stages and funded private centres are mapped explicitly',()=>{
 const raw={codi_centre:'08000013',denominaci_completa:'Escola',nom_municipi:'Barcelona',einf1c:'EINF1C',einf2c:'EINF2C',nom_naturalesa:'Privat'};
 assert.equal(schoolRows([raw],[])[0].kind,'Privada');
 assert.equal(schoolRows([raw],[{codi_centre:'08000013',unitats_concertades_einf:'3'}])[0].kind,'Concertada');
 assert.equal(schoolRows([{...raw,nom_naturalesa:'Públic'}],[])[0].kind,'Pública');
 assert.equal(schoolRows([raw],[])[0].id,'8000013');assert.equal(schoolRows([raw],[])[0].age,'0-6');
});
test('Source failure preserves last snapshot; successful empty response removes only its source',()=>{
 const old=[{source:'Feina Activa',id:'1'},{source:'Empléate / SEPE',id:'2'}];
 assert.deepEqual(mergeSource(old,'Feina Activa',[],false),old);
 assert.deepEqual(mergeSource(old,'Feina Activa',[],true),[old[1]]);
});
test('Closed or expired vacancies are excluded; coordinators need educational context',()=>{
 const raw={reference:'FA123',isOpenInscription:true,status:'PUBLISHED',content:{title:'Educador/a infantil'},offerDetail:{closesAt:'2027-01-01'},publishedAt:'2026-10-01'};
 assert.equal(faJobs([raw,{...raw,isOpenInscription:false}],Date.parse('2026-10-12')).length,1);
 assert.equal(faJobs([raw],Date.parse('2028-01-01')).length,0);
 assert.equal(relevant('Coordinador de logística'),false);assert.equal(relevant('Monitor menjador escolar'),true);
 assert.equal(relevant('Tallerista ioga casal cívic'),false);assert.equal(relevant('Auxiliar neteja escola bressol'),false);
 assert.equal(relevant('Tallerista teatre per infants casal cívic'),true);
});
test('Gmail extracts relevant links without exposing message headers, body or sender',()=>{
 const text='<a href="https://www.linkedin.com/jobs/view/123">Educadora infantil</a><a href="https://evil.example/jobs/view/9">Educadora infantil</a>';
 const message={id:'private-message',internalDate:'1791792000000',payload:{headers:[{name:'From',value:'alerts@linkedin.com'}],body:{data:Buffer.from(text).toString('base64url')}}};
 const jobs=alertJobs(message);assert.equal(jobs.length,1);assert(!JSON.stringify(jobs).includes('private-message'));assert(!JSON.stringify(jobs).includes('alerts@'));
});
test('Private feed uses authenticated encryption and rejects altered ciphertext',()=>{
 const key=randomBytes(32),payload={jobs:[{title:'Privada'}]},envelope=encryptFeed(payload,key.toString('base64'));
 assert(!JSON.stringify(envelope).includes('Privada'));
 const bytes=Buffer.from(envelope.ciphertext,'base64'),d=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
 d.setAAD(Buffer.from('el-meu-mapa-gmail-v1'));d.setAuthTag(bytes.subarray(-16));
 assert.deepEqual(JSON.parse(Buffer.concat([d.update(bytes.subarray(0,-16)),d.final()]).toString()),payload);
 bytes[0]^=1;const tampered=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));tampered.setAAD(Buffer.from('el-meu-mapa-gmail-v1'));tampered.setAuthTag(bytes.subarray(-16));tampered.update(bytes.subarray(0,-16));assert.throws(()=>tampered.final());
});
