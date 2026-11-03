import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const docsSource=await readFile(new URL('../assets/js/documents.js',import.meta.url),'utf8');
const gmailSource=await readFile(new URL('../assets/js/gmail.js',import.meta.url),'utf8');
function setup(){
  const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{checked:false,value:'',style:{},addEventListener(){}});return nodes.get(id)};
  const context=vm.createContext({document:{getElementById:node},window:{},TextEncoder,Uint8Array,btoa,Date,URL,setTimeout(){}});
  vm.runInContext(docsSource,context);vm.runInContext(gmailSource,context);
  const files={cv:{name:'complete.pdf',type:'application/pdf',blob:new Blob(['complete'])},letter:{name:'presentation.pdf',type:'application/pdf',blob:new Blob(['letter'])},cvAlternative:{name:'second.pdf',type:'application/pdf',blob:new Blob(['second'])},recommendation:{name:'recommendation.pdf',type:'application/pdf',blob:new Blob(['recommendation'])}};
  context.getDoc=async key=>files[key]||null;context.blobBase64=async blob=>Buffer.from(await blob.arrayBuffer()).toString('base64');
  return {context,node,files};
}
test('two CVs plus presentation when second CV selected',async()=>{
  const s=setup();s.node('includeCvAlternative').checked=true;
  assert.deepEqual(Array.from(await s.context.candidatureDocuments(),x=>x.name),['complete.pdf','presentation.pdf','second.pdf']);
});
test('recommendation is included only when selected',async()=>{
  const s=setup();s.node('includeCvAlternative').checked=true;s.node('includeRecommendation').checked=true;
  const docs=await s.context.candidatureDocuments();assert.equal(docs.length,4);
  const raw=await s.context.buildGmailRaw('example@example.org','Application','Text',docs);
  const mime=Buffer.from(raw,'base64url').toString();
  for(const name of ['complete.pdf','presentation.pdf','second.pdf','recommendation.pdf'])assert(mime.includes('filename="'+name+'"'));
  assert.equal((mime.match(/Content-Disposition: attachment/g)||[]).length,4);
});
test('selected missing document blocks sending rather than silently omitting it',async()=>{
  const s=setup();delete s.files.recommendation;s.node('includeRecommendation').checked=true;
  await assert.rejects(s.context.candidatureDocuments(),/falta el fitxer/);
});
test('principal CV is preserved when second CV is unchecked',async()=>{
  const s=setup();assert.deepEqual(Array.from(await s.context.candidatureDocuments(),x=>x.name),['complete.pdf','presentation.pdf']);
});
