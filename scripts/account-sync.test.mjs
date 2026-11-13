import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const code=await readFile(new URL('../assets/js/account-sync-core.js',import.meta.url),'utf8');
function setup(fetcher){const context={crypto:webcrypto,btoa,atob,Uint8Array,TextEncoder,TextDecoder,FormData,File,URL,URLSearchParams,AbortSignal,fetch:fetcher};vm.createContext(context);vm.runInContext(code,context);return new context.MapaAccountCore.AccountStore({token:'synthetic-token',fetcher})}
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
test('private upload encrypts bytes and a second device decrypts them without sending the key to storage',async()=>{
 let ciphertext;const calls=[];
 const fetcher=async(url,options={})=>{calls.push({url,options});if(url.endsWith('/UploadPrivateFile')){ciphertext=await options.body.get('file').arrayBuffer();return reply({file_uri:'private/test/random.bin'})}if(url.endsWith('/CreateFileSignedUrl'))return reply({signed_url:'https://private.example/file'});if(url==='https://private.example/file')return new Response(ciphertext);throw Error(url)};
 const first=setup(fetcher),raw=new TextEncoder().encode('Synthetic private CV');const ref=await first.upload(raw);assert.notEqual(new TextDecoder().decode(ciphertext),'Synthetic private CV');
 const second=setup(fetcher),restored=await second.download(ref);assert.equal(new TextDecoder().decode(restored),'Synthetic private CV');
 assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-token');assert.equal(calls.at(-1).options.headers,undefined);assert(!calls.some(c=>c.url.includes(ref.key)));
 const count=calls.length;await first.upload(raw,ref);assert.equal(calls.length,count,'unchanged document is not uploaded again');
});
test('tampered ciphertext fails without yielding private bytes',async()=>{let ciphertext;const s=setup(async(url,options={})=>{if(url.endsWith('/UploadPrivateFile')){ciphertext=new Uint8Array(await options.body.get('file').arrayBuffer());return reply({file_uri:'private/test/file.bin'})}if(url.endsWith('/CreateFileSignedUrl'))return reply({signed_url:'https://private.example/file'});return new Response(ciphertext)});const ref=await s.upload(new TextEncoder().encode('CV'));ciphertext[0]^=1;await assert.rejects(s.download(ref));});
test('authentication failure is explicit and never substitutes an empty successful result',async()=>{const s=setup(async()=>reply({},401));await assert.rejects(s.list('owner'),e=>e.status===401);});
test('private record rules cover read, create, update and delete',async()=>{const schema=JSON.parse(await readFile(new URL('../backend/base44/entities/SyncDevice.jsonc',import.meta.url),'utf8'));for(const op of ['read','create','update','delete'])assert.deepEqual(schema.rls[op],{created_by_id:'{{user.id}}'});});

test('browser fetch retains the Window receiver for account requests and private downloads',async()=>{
 const context={crypto:webcrypto,btoa,atob,Uint8Array,TextEncoder,TextDecoder,FormData,File,URL,URLSearchParams,AbortSignal};
 vm.createContext(context);
 vm.runInContext(`fetch=function(){if(this!==globalThis)throw TypeError('Illegal invocation');return Promise.resolve({ok:true,status:200,json:async()=>({id:'synthetic-user'})})}`,context);
 vm.runInContext(code,context);
 const store=new context.MapaAccountCore.AccountStore();
 assert.equal((await store.me()).id,'synthetic-user');
 assert.equal((await store.reset('test@example.invalid')).id,'synthetic-user');
});
