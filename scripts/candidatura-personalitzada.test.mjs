import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const node=()=>({value:'',innerHTML:'',addEventListener(){}});
const context=vm.createContext({document:{getElementById:node,addEventListener(){}},window:{}});
vm.runInContext(await readFile(new URL('../assets/js/candidatura-personalitzada.js',import.meta.url),'utf8'),context);
const profile={name:'Example',bio:'General text that must never be copied',roleBio:{infantil03:'Verified nursery experience.',primaria:'Primary support experience. Degree in progress.',monitoratge:'Verified monitor experience.',direccio:'Verified director experience.',coordinacio:'Verified coordination experience.'}};
test('nursery draft names the specific centre and uses only nursery experience',()=>{
  const d=context.composeCandidature({name:'School A',city:'Town A'},'infantil03',profile);
  assert(d.subject.includes('School A'));assert(d.body.includes('School A (Town A)'));
  assert(d.body.includes(profile.roleBio.infantil03));assert(!d.body.includes(profile.bio));assert(!d.body.includes(profile.roleBio.direccio));
});
test('different centres produce different addressed drafts',()=>{
  const a=context.composeCandidature({name:'School A'},'infantil03',profile),b=context.composeCandidature({name:'School B'},'infantil03',profile);
  assert.notEqual(a.body,b.body);assert(!b.body.includes('School A'));
});
test('director, monitor and coordinator drafts use separate experience',()=>{
  for(const role of ['direccio','monitoratge','coordinacio']){
    const d=context.composeCandidature({name:'Entity'},role,profile);assert(d.body.includes(profile.roleBio[role]));
    for(const other of ['direccio','monitoratge','coordinacio'].filter(x=>x!==role))assert(!d.body.includes(profile.roleBio[other]));
  }
});
test('primary support does not claim a completed Primary teaching degree',()=>{
  const d=context.composeCandidature({name:'Primary School'},'primaria',profile);
  assert(d.body.includes('educadora de reforç i suport a Primària'));assert(d.body.includes(profile.roleBio.primaria));assert(!d.body.includes('mestra d’educació infantil'));
});
test('missing private experience produces a complete draft without invented experience',()=>{
  const d=context.composeCandidature({name:'School'},'infantil36',profile);assert(d.body.length>300);assert.equal(d.ready,true);assert.equal(d.personalized,false);assert(!d.body.includes(profile.bio));
});
test('stage and active service filter determine the initial role',()=>{
  assert.equal(context.inferCandidatureRole({age:'0-3'}),'infantil03');assert.equal(context.inferCandidatureRole({age:'3-6'}),'infantil36');
  assert.equal(context.inferCandidatureRole({},'migdia'),'menjador');assert.equal(context.inferCandidatureRole({jobTitle:'Directora de lleure'}),'direccio');
  assert.equal(context.inferCandidatureRole({}),'direccio');
});

test('finished draft signs Diana and has no completion markers',()=>{const d=context.composeCandidature({name:'School'},'infantil03',profile);assert(d.body.endsWith('Atentament,\nDiana'));assert(!d.body.includes('[Completa'));assert(d.ready)});
test('user preferred wording is complete and addresses the specific vacancy',()=>{const d=context.composeCandidature({name:'School B',jobTitle:'Mestra I3'},'infantil36',profile);assert(d.body.startsWith('Bon dia,\n\nEm dic Example'));assert(d.body.includes('oferta «Mestra I3»'));assert(d.body.includes('en aquesta vacant'));assert(d.body.includes('Moltes gràcies pel vostre temps i per valorar la meva candidatura.'));assert(!d.body.includes('Graduada en Educació Primària'));});
