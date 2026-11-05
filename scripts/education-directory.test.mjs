import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolRows} from './sync-lib.mjs';
import {schoolNetwork} from './school-networks.mjs';
test('primary-only schools survive the directory filter with their verified stage',()=>{
 const rows=schoolRows([{codi_centre:'08000001',denominaci_completa:'Primary',nom_municipi:'Town',nom_naturalesa:'Públic',epri:'EPRI'}],[]);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].stages,['primaria']);assert.equal(rows[0].age,'primaria');assert.equal(rows[0].kind,'Pública');
});
test('a matching word is not enough to invent network membership',()=>{
 assert.deepEqual(schoolNetwork({denominaci_completa:'Escola Cristiana Example',url:'https://fedac.cat.example.org'}),{});
 assert.equal(schoolNetwork({denominaci_completa:'FEP Bon Pastor'}).networkId,'xarxa_fep');
 assert.equal(schoolNetwork({url:'https://example.escolapia.cat'}).networkId,'xarxa_escolapia');
});
test('concerted classification uses the funding list rather than the school name',()=>{
 const x={codi_centre:'08000001',denominaci_completa:'Example',einf2c:'EINF2C',epri:'EPRI',nom_naturalesa:'Privat'};
 const rows=schoolRows([x],[{codi_centre:'08000001',unitats_concertades_epri:'2'}]);assert.equal(rows[0].kind,'Concertada');assert.deepEqual(rows[0].stages,['infantil','primaria']);
});
