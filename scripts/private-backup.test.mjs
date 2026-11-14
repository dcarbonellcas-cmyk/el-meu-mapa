import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const source=(await readFile(new URL('../assets/js/private-backup.js',import.meta.url),'utf8')).split('\n(() => {')[0];
const tracking=await readFile(new URL('../assets/js/private-tracking.js',import.meta.url),'utf8');
function setup({failDatabase=false}={}){
 const storage=new Map(),docs=new Map();
 const localStorage={get length(){return storage.size},key:i=>[...storage.keys()][i],getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const context=vm.createContext({DOC_STORE:'files',crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,Blob,Date,Map,Set,JSON,Number,Error,btoa,atob,localStorage,document:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},Event:class{},
 candidateProfile:()=>JSON.parse(localStorage.getItem('mapaEscolesProfile_v1')||'{}'),loadLegacyRows:()=>JSON.parse(localStorage.getItem('mapaEscolesLegacyRows_v1')||'[]'),getDoc:async key=>docs.get(key),blobBase64:async blob=>Buffer.from(await blob.arrayBuffer()).toString('base64'),
 docDB:async()=>({close(){},transaction(){const pending=[],tx={objectStore:()=>({put:(value,key)=>pending.push([key,value])})};queueMicrotask(()=>{if(failDatabase){tx.error=Error('Storage full');tx.onabort()}else{for(const [key,row] of pending)docs.set(key,row);tx.oncomplete()}});return tx}})});
 vm.runInContext(tracking,context);vm.runInContext(source,context);return {context,storage,docs};
}
const payload=()=>({version:1,profile:{name:'Test teacher',bio:'Test qualification',roleBio:{},updated:'2026-11-13T12:00:00Z'},documents:[{key:'cv',name:'test.pdf',type:'application/pdf',deleted:false,updated:'2026-11-13T12:00:00Z',data:btoa('PDF fixture')}],tracking:{version:1,key:'tracking',updated:'2026-11-13T12:00:00Z',entries:{history_test:{updated:'2026-11-13T12:00:00Z',value:JSON.stringify([{date:'2026-11-01T10:00:00Z',type:'sent',text:'Confirmed send'}])}}},legacyRows:[]});
test('encrypted portable copy restores a profile, PDF and candidature on an empty device without Google',async()=>{
 const first=setup(),second=setup(),p=payload();const envelope=await first.context.encryptPrivateBackup(p,'A test password 2026');
 assert(!JSON.stringify(envelope).includes('Test teacher'));assert(!JSON.stringify(envelope).includes('Confirmed send'));
 const decoded=await second.context.decryptPrivateBackup(envelope,'A test password 2026');await second.context.restorePortableBackup(decoded);
 assert.equal(JSON.parse(second.storage.get('mapaEscolesProfile_v1')).name,p.profile.name);assert.equal(await second.docs.get('cv').blob.text(),'PDF fixture');assert.equal(JSON.parse(second.storage.get('history_test'))[0].type,'sent');
});
test('wrong password and tampered ciphertext cannot restore or replace existing records',async()=>{
 const s=setup();s.storage.set('note_test','Existing note');const envelope=await s.context.encryptPrivateBackup(payload(),'A test password 2026');
 await assert.rejects(s.context.decryptPrivateBackup(envelope,'Wrong password 2026'));
 const altered={...envelope,data:(envelope.data[0]==='A'?'B':'A')+envelope.data.slice(1)};await assert.rejects(s.context.decryptPrivateBackup(altered,'A test password 2026'));
 assert.equal(s.storage.get('note_test'),'Existing note');assert.equal(s.docs.size,0);
});
test('invalid tracking keys are rejected before any profile or PDF is written',async()=>{
 const s=setup(),p=payload();p.tracking.entries.access_token={updated:p.profile.updated,value:'Not permitted'};
 await assert.rejects(s.context.restorePortableBackup(p));assert.equal(s.storage.size,0);assert.equal(s.docs.size,0);
});
test('import preserves newer documents and merges distinct histories without duplicating on repeated import',async()=>{
 const s=setup();s.docs.set('cv',{name:'newer.pdf',blob:new Blob(['NEW']),type:'application/pdf',updated:'2026-11-14T12:00:00Z'});
 s.storage.set('history_test',JSON.stringify([{date:'2026-11-12T10:00:00Z',type:'sent',text:'More recent send'}]));
 await s.context.restorePortableBackup(payload());await s.context.restorePortableBackup(payload());
 assert.equal(await s.docs.get('cv').blob.text(),'NEW');assert.equal(JSON.parse(s.storage.get('history_test')).length,2);
});
test('database failure rolls back profile and candidature writes and retains the source document',async()=>{
 const s=setup({failDatabase:true});s.storage.set('mapaEscolesProfile_v1',JSON.stringify({name:'Original profile',bio:'Original',updated:'2026-11-01T12:00:00Z'}));
 await assert.rejects(s.context.restorePortableBackup(payload()));assert.equal(JSON.parse(s.storage.get('mapaEscolesProfile_v1')).name,'Original profile');assert(!s.storage.has('history_test'));assert.equal(s.docs.size,0);
});
test('export never copies OAuth sessions or arbitrary browser storage',async()=>{
 const s=setup();s.storage.set('mapaPrivateDriveSession_v1','SECRET');s.storage.set('access_token','SECRET');s.storage.set('note_test','Keep note');
 const p=await s.context.collectPrivateBackup();assert(!JSON.stringify(p).includes('SECRET'));assert.equal(p.tracking.entries.note_test.value,'Keep note');
});

test('cloud merge preserves distinct Gmail messages sent in the same second and deduplicates repeat imports',()=>{
 const s=setup(),date='2026-11-12T10:00:00.000Z';
 const item=id=>({type:'gmail_sent_index',text:'Correu de candidatura a Gmail',date,gmailId:id,placeId:'school'});
 const record=rows=>({version:1,key:'tracking',updated:date,entries:{history_gmail_sent_index:{updated:date,value:JSON.stringify(rows)}}});
 const first=record([item('aaaaaaaaaaaaaaaa'),item('bbbbbbbbbbbbbbbb')]);
 const second=record([item('aaaaaaaaaaaaaaaa'),item('cccccccccccccccc')]);
 const merged=s.context.mergePrivateTracking(first,second);
 assert.equal(JSON.parse(merged.entries.history_gmail_sent_index.value).length,3);
 const again=s.context.mergePrivateTracking(merged,first);
 assert.equal(JSON.parse(again.entries.history_gmail_sent_index.value).length,3);
});
