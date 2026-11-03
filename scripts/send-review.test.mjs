import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../assets/js/gmail.js',import.meta.url),'utf8').split('document.getElementById(\'sendGmail\').addEventListener')[0];
function setup({archiveFails=false,httpFails=false}={}){
 const elements={sendGmail:{},gmailNotice:{style:{}}},saved=[],requests=[],statuses=[];
 const ctx={document:{getElementById:id=>elements[id]},TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),Date,localStorage:{setItem:(...x)=>statuses.push(x)},addHist(){},lastSent(){return null},window:{},setTimeout(){},applicationArchive:async(op,x)=>{if(archiveFails)throw Error('disk full');saved.push(x)},renderSentArchive:async()=>{},fetch:async(url,args)=>{requests.push(args);return {ok:!httpFails,status:403,json:async()=>httpFails?{error:{message:'denied'}}:{id:'gmail-123',threadId:'thread-1'}}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);vm.runInContext('buildGmailRaw=async(to,subject,body,docs)=>JSON.stringify({to,subject,body,names:docs.map(d=>d.name)})',ctx);
 return {ctx,elements,saved,requests,statuses};
}
const snapshot={id:'centre-1',centre:'Escola de prova',role:'Infantil',to:'prova@example.org',subject:'Text revisat',body:'Cos revisat',docs:[{name:'CV.pdf',type:'application/pdf',blob:{size:5}}]};
test('send uses reviewed snapshot and archives exact message after Gmail success',async()=>{const x=setup();await x.ctx.actuallySendGmail('token',snapshot);assert.equal(x.requests.length,1);assert.equal(x.saved[0].body,snapshot.body);assert.equal(x.saved[0].gmailId,'gmail-123');assert.deepEqual(x.saved[0].attachments[0].name,'CV.pdf');assert.equal(x.statuses[0][0],'status_centre-1')});
test('Gmail rejection never archives a sent message',async()=>{const x=setup({httpFails:true});await x.ctx.actuallySendGmail('token',snapshot);assert.equal(x.saved.length,0);assert.equal(x.statuses.length,0);assert.match(x.elements.gmailNotice.textContent,/No s’ha enviat/)});
test('archive failure after delivery warns without encouraging duplicate send',async()=>{const x=setup({archiveFails:true});await x.ctx.actuallySendGmail('token',snapshot);assert.match(x.elements.gmailNotice.textContent,/Gmail ha enviat/);assert.equal(x.elements.sendGmail.disabled,true);assert.equal(x.requests.length,1)});
