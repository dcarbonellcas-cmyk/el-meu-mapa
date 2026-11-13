import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const docsSource=await readFile(new URL('../assets/js/documents.js',import.meta.url),'utf8');
const gmailSource=await readFile(new URL('../assets/js/gmail.js',import.meta.url),'utf8');
function setup(){
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,value:'',style:{},addEventListener(){},replaceChildren(){}});return nodes.get(id)};
  const context=vm.createContext({document:{getElementById:node,addEventListener(){}},window:{},TextEncoder,Uint8Array,btoa,Date,URL,esc:text=>text,setTimeout(){}});
  vm.runInContext(docsSource,context);vm.runInContext(gmailSource,context);
  const files={cv:{name:'complete.pdf',type:'application/pdf',blob:new Blob(['complete'])},letter:{name:'presentation.pdf',type:'application/pdf',blob:new Blob(['letter'])},cvAlternative:{name:'second.pdf',type:'application/pdf',blob:new Blob(['second'])},recommendation:{name:'recommendation.pdf',type:'application/pdf',blob:new Blob(['recommendation'])}};
  context.getDoc=async key=>files[key]||null;context.blobBase64=async blob=>Buffer.from(await blob.arrayBuffer()).toString('base64');
  return {context,node,files};
}
test('two CVs plus presentation when second CV selected',async()=>{
  const s=setup();s.node('includeCvAlternative').checked=true;
  assert.deepEqual(Array.from(await s.context.candidatureDocuments(),x=>x.name),['complete.pdf','presentation.pdf','second.pdf']);
});
test('a new draft includes both saved optional documents by default',async()=>{
  const s=setup();s.context.showMailDraft({id:1,email:'example@example.org'},'Application','Text');
  const docs=await s.context.candidatureDocuments();assert.equal(docs.length,4);
  const raw=await s.context.buildGmailRaw('example@example.org','Application','Text',docs);
  const mime=Buffer.from(raw,'base64url').toString();
  for(const name of ['complete.pdf','presentation.pdf','second.pdf','recommendation.pdf'])assert(mime.includes('filename="'+name+'"'));
  assert.equal((mime.match(/Content-Disposition: attachment/g)||[]).length,4);
});
test('unavailable optional documents do not block a draft',async()=>{
  const s=setup();delete s.files.recommendation;delete s.files.cvAlternative;
  s.context.showMailDraft({id:1,email:'example@example.org'},'Application','Text');
  assert.deepEqual(Array.from(await s.context.candidatureDocuments(),x=>x.name),['complete.pdf','presentation.pdf']);
  delete s.files.letter;
  await assert.rejects(s.context.candidatureDocuments(),/carta de presentació/);
});
test('principal CV is preserved when second CV is unchecked',async()=>{
  const s=setup();assert.deepEqual(Array.from(await s.context.candidatureDocuments(),x=>x.name),['complete.pdf','presentation.pdf']);
});

test('manual Gmail preparation preserves the message and offers every selected attachment without sending',async()=>{
 const nodes=new Map(),handlers=new Map();
 const element=()=>({children:[],style:{},checked:false,value:'',append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},addEventListener(){}});
 const node=id=>{if(!nodes.has(id)){const n=element();n.addEventListener=(event,handler)=>handlers.set(id+':'+event,handler);nodes.set(id,n)}return nodes.get(id)};
 const context=vm.createContext({document:{getElementById:node,addEventListener(){},createElement:element},window:{},URL,URLSearchParams,TextEncoder,Uint8Array,btoa,Date,setTimeout(){},fetch(){throw Error('Preparing must not send a message')}});
 vm.runInContext(docsSource,context);
 context.getDoc=async key=>({name:key+'.pdf',type:'application/pdf',blob:new Blob([key])});
 node('includeCvAlternative').checked=true;node('includeRecommendation').checked=true;
 node('draftTo').value='school@example.org';node('draftSubject').value='Candidatura · Educació';node('draftBody').value='Bon dia,\nText amb accents i & símbols.';
 await handlers.get('manualMail:click')();
 const options=node('manualMailOptions');assert.equal(options.hidden,false);
 const files=options.children[1];assert.equal(files.children.length,4);
 const gmail=options.children[2],url=new URL(gmail.href);assert.equal(url.origin,'https://mail.google.com');assert.equal(url.searchParams.get('to'),'school@example.org');assert.equal(url.searchParams.get('su'),node('draftSubject').value);assert.equal(url.searchParams.get('body'),node('draftBody').value);assert.equal(gmail.target,'_blank');
});
