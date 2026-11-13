import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../assets/js/borses.js',import.meta.url),'utf8')).split('\n(() => {')[0];
const ctx=vm.createContext({URL,Date});vm.runInContext(source,ctx);
function storage(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:key=>map.get(key)||null,setItem:(k,v)=>map.set(k,v)}}
const row={id:'xarxa_test',name:'School test',url:'https://example.com/jobs',note:'Application acknowledged',status:'registered',reviewedAt:'2026-11-13T12:00:00Z'};
test('imported confirmations are private portal records and repeat import does not duplicate',()=>{
 const s=storage();ctx.importPrivatePortals(s,[row]);ctx.importPrivatePortals(s,[row]);
 assert.equal(s.length,1);assert.equal(ctx.privatePortalRows(s)[0].status,'registered');
 assert(s.map.has('jobPortal_xarxa_test'));
});
test('a later unchecked box is preserved when reimporting old evidence',()=>{
 const s=storage();s.setItem('jobPortal_xarxa_test',JSON.stringify({status:'pending',updated:'2026-11-14T12:00:00Z'}));
 ctx.importPrivatePortals(s,[row]);assert.equal(ctx.privatePortalRows(s)[0].status,'pending');
});
test('invalid file is rejected before any portal changes and unsafe links cannot be imported',()=>{
 const s=storage();assert.throws(()=>ctx.importPrivatePortals(s,[row,{...row,id:'other',url:'javascript:alert(1)'}]));assert.equal(s.length,0);
 assert.throws(()=>ctx.importPrivatePortals(s,[row,row]));assert.equal(s.length,0);
});
