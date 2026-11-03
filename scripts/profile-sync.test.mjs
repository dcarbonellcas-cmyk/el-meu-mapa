import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../assets/js/private-sync.js',import.meta.url),'utf8');
const profileSource=await readFile(new URL('../assets/js/perfil.js',import.meta.url),'utf8');
const record=(key,updated,extra={})=>({version:1,key,updated,name:'Example',...(key==='profile'?{bio:'Training'}:{type:'application/pdf',data:'cGRm'}),...extra});
function setup({profile={},docs={},remote={},failure=0}={}){
  const events=new Map(),elements=new Map(),storage=new Map([['mapaEscolesProfile_v1',JSON.stringify(profile)]]),calls=[];
  const node=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',addEventListener(type,fn){this[type]=fn}});return elements.get(id)};
  const files=new Map(Object.entries(remote).map(([key,value])=>[key,{id:key,name:'mapa-'+key+'-v1.json',value}]));
  let pending;
  const context={URLSearchParams,Blob,File,Uint8Array,Event,crypto:webcrypto,atob,Date,JSON,Math,Number,Error,
    setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:{hidden:false,getElementById:node,addEventListener:(type,fn)=>events.set(type,fn),dispatchEvent:e=>events.get(e.type)?.(e)},
    window:{addEventListener:()=>{}},
    candidateProfile:()=>JSON.parse(storage.get('mapaEscolesProfile_v1')||'{}'),
    getDoc:async key=>docs[key]||null,
    saveDoc:async(key,file,options)=>{docs[key]={blob:file,name:file.name,type:file.type,updated:options.updated}},
    blobBase64:async blob=>Buffer.from(await blob.arrayBuffer()).toString('base64'),
    fetch:async(url,options)=>{
      calls.push({url,options});
      const ok=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{ETag:'"one"'}});
      if(failure)return ok({},failure);
      const u=new URL(url);
      if(!u.hostname.endsWith('googleapis.com'))throw Error('Unexpected destination');
      if(u.searchParams.get('spaces'))return ok({files:[...files.values()].map(({id,name})=>({id,name}))});
      if(u.searchParams.get('alt'))return ok(files.get(u.pathname.split('/').at(-1)).value);
      if(options.method==='PATCH'){
        assert.equal(options.headers['If-Match'],'"one"');const key=u.pathname.split('/').at(-1);files.get(key).value=JSON.parse(options.body);return ok({});
      }
      assert.equal(options.method,'POST');assert.match(options.headers['Content-Type'],/^multipart\/related/);
      const boundary=options.headers['Content-Type'].split('boundary=')[1];
      const parts=options.body.split('--'+boundary);const data=JSON.parse(parts[2].split('\r\n\r\n')[1].trim());
      files.set(data.key,{id:data.key,name:'mapa-'+data.key+'-v1.json',value:data});return ok({id:data.key});
    },
    google:{accounts:{oauth2:{initTokenClient:options=>({requestAccessToken:()=>{pending=options.callback({access_token:'test-token',expires_in:3600})}})}}}
  };
  context.window.google=context.google;
  vm.runInNewContext(source,context);
  return {calls,files,docs,node,storage,context,connect:async()=>{node('connectPrivateDrive').click();await pending}};
}
test('profile autosaves without clicking Save and restores saved fields',()=>{
  const s=setup();vm.runInNewContext(profileSource,s.context);
  s.node('candidateName').value='Example';s.node('candidateName').input();
  s.node('candidateBio').value='Training';s.node('candidateBio').input();
  const saved=JSON.parse(s.storage.get('mapaEscolesProfile_v1'));
  assert.equal(saved.name,'Example');assert.equal(saved.bio,'Training');assert(saved.updated);
  s.node('candidateName').value='';s.context.document.dispatchEvent(new Event('private-data-restored'));
  assert.equal(s.node('candidateName').value,'Example');
});
test('empty second device restores private profile and both PDF files',async()=>{
  const updated='2026-11-01T12:00:00Z';const s=setup({remote:{profile:record('profile',updated),cv:record('cv',updated),letter:record('letter',updated)}});
  await s.connect();assert.equal(JSON.parse(s.storage.get('mapaEscolesProfile_v1')).bio,'Training');
  assert.equal(await s.docs.cv.blob.text(),'pdf');assert.equal(await s.docs.letter.blob.text(),'pdf');
  assert(!s.calls.some(x=>['POST','PATCH'].includes(x.options.method)));
});
test('newer local data uploads; absent local documents never erase cloud copies',async()=>{
  const s=setup({profile:{name:'Updated',bio:'Training',updated:'2026-11-02T12:00:00Z'},remote:{profile:record('profile','2026-11-01T12:00:00Z'),letter:record('letter','2026-11-01T12:00:00Z')}});
  await s.connect();assert.equal(s.files.get('profile').value.name,'Updated');assert(s.docs.letter);
});
test('first device creates only app-private files and no token is persisted',async()=>{
  const s=setup({profile:{name:'Example',bio:'Training',updated:'2026-11-02T12:00:00Z'}});await s.connect();
  assert.equal(s.files.size,1);assert.match(s.calls.at(-1).options.body,/appDataFolder/);
  assert(![...s.storage.values()].some(x=>x.includes('test-token')));
});
test('Drive error preserves local data and displays a useful message',async()=>{
  const p={name:'Example',bio:'Training'};const s=setup({profile:p,failure:403});await s.connect();
  assert.deepEqual(JSON.parse(s.storage.get('mapaEscolesProfile_v1')),p);
  assert.match(s.node('privateSyncStatus').textContent,/habilitar Google Drive API/);
});
test('invalid private data does not replace existing local data',async()=>{
  const p={name:'Example',bio:'Training'};const s=setup({profile:p,remote:{profile:{version:99}}});await s.connect();
  assert.deepEqual(JSON.parse(s.storage.get('mapaEscolesProfile_v1')),p);assert.match(s.node('privateSyncStatus').textContent,/no vàlida/);
});
