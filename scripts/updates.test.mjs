import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/js/updates.js',import.meta.url),'utf8');
function setup({version='2222222222222222',draft=false,fail=false}={}){
 const events={},nodes=[],replaced=[],requests=[];
 const home={style:{},append:el=>nodes.push(el)};
 const document={hidden:false,activeElement:{tagName:'BUTTON'},querySelector:s=>s.startsWith('meta')?{content:'1111111111111111'}:null,querySelectorAll:()=>[],getElementById:id=>id==='homePage'?home:id==='mailDraftModal'?{style:{display:draft?'flex':'none'}}:null,addEventListener:(name,fn)=>events[name]=fn,createElement:()=>({style:{},append(){},setAttribute(){},addEventListener(name,fn){this[name]=fn}})};
 const context=vm.createContext({document,window:{addEventListener:(name,fn)=>events[name]=fn},location:{protocol:'https:',href:'https://example.com/mapa/',replace:url=>replaced.push(url)},URL,Date,AbortSignal,setInterval(){},confirm:()=>false,fetch:async(url,options)=>{requests.push(options);if(fail)throw Error('offline');return {ok:true,json:async()=>({version})}}});
 vm.runInContext(source,context);return {events,nodes,replaced,requests};
}
test('resumed app fetches the publication without cache and loads a newer version',async()=>{const s=setup();await s.events.pageshow();assert.equal(s.requests[0].cache,'no-store');assert.match(s.replaced[0],/app-update=2222222222222222/);});
test('a prepared candidature is never automatically replaced by an update',async()=>{const s=setup({draft:true});await s.events.pageshow();assert.equal(s.replaced.length,0);});
test('network failure leaves the page and private data intact',async()=>{const s=setup({fail:true});await s.events.pageshow();assert.equal(s.replaced.length,0);});
test('unchanged publication does not reload in a loop',async()=>{const s=setup({version:'1111111111111111'});await s.events.pageshow();assert.equal(s.replaced.length,0);});
