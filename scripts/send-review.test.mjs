import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../assets/js/gmail.js',import.meta.url),'utf8').split('document.getElementById(\'sendGmail\').addEventListener')[0];
function setup({archiveFails=false,httpFails=false}={}){
 const elements={sendGmail:{},gmailNotice:{style:{}}},saved=[],requests=[],statuses=[];
 const ctx={document:{getElementById:id=>elements[id]},TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),Date,localStorage:{setItem:(...x)=>statuses.push(x)},addHist(){},lastSent(){return null},window:{},setTimeout(){},clearTimeout(){},applicationArchive:async(op,x)=>{if(archiveFails)throw Error('disk full');saved.push(x)},renderSentArchive:async()=>{},fetch:async(url,args)=>{requests.push(args);return {ok:!httpFails,status:403,json:async()=>httpFails?{error:{message:'denied'}}:{id:'gmail-123',threadId:'thread-1'}}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);vm.runInContext('buildGmailRaw=async(to,subject,body,docs)=>JSON.stringify({to,subject,body,names:docs.map(d=>d.name)})',ctx);
 return {ctx,elements,saved,requests,statuses};
}
const snapshot={id:'centre-1',centre:'Escola de prova',role:'Infantil',to:'prova@example.org',subject:'Text revisat',body:'Cos revisat',docs:[{name:'CV.pdf',type:'application/pdf',blob:{size:5}}]};
test('send uses reviewed snapshot and archives exact message after Gmail success',async()=>{const x=setup();await x.ctx.actuallySendGmail('token',snapshot);assert.equal(x.requests.length,1);assert.equal(x.saved[0].body,snapshot.body);assert.equal(x.saved[0].gmailId,'gmail-123');assert.deepEqual(x.saved[0].attachments[0].name,'CV.pdf');assert.equal(x.statuses[0][0],'status_centre-1')});
test('Gmail rejection never archives a sent message',async()=>{const x=setup({httpFails:true});await x.ctx.actuallySendGmail('token',snapshot);assert.equal(x.saved.length,0);assert.equal(x.statuses.length,0);assert.match(x.elements.gmailNotice.textContent,/No s’ha enviat/)});
test('archive failure after delivery warns without encouraging duplicate send',async()=>{const x=setup({archiveFails:true});await x.ctx.actuallySendGmail('token',snapshot);assert.match(x.elements.gmailNotice.textContent,/Gmail ha enviat/);assert.equal(x.elements.sendGmail.disabled,true);assert.equal(x.requests.length,1)});

test('blocked Google popup re-enables sending and never calls Gmail send',()=>{
 const x=setup();let config;
 x.ctx.google={accounts:{oauth2:{initTokenClient:c=>{config=c;return {requestAccessToken(){c.error_callback({type:'popup_failed_to_open'})}}}}}};x.ctx.window.google=x.ctx.google;
 x.ctx.authorizeReviewedGmail(snapshot);
 assert.equal(x.elements.sendGmail.disabled,false);assert.match(x.elements.gmailNotice.textContent,/No s’ha pogut obrir Google/);assert.equal(x.requests.length,0);assert(config.error_callback);
});
test('closing Google authorization never sends and permits retry',()=>{
 const x=setup();x.ctx.google={accounts:{oauth2:{initTokenClient:c=>({requestAccessToken(){c.error_callback({type:'popup_closed'})}})}}};x.ctx.window.google=x.ctx.google;
 x.ctx.authorizeReviewedGmail(snapshot);assert.equal(x.elements.sendGmail.disabled,false);assert.equal(x.requests.length,0);assert.match(x.elements.gmailNotice.textContent,/Has tancat/);
});
test('review confirmation invokes authorization inside the click handler',async()=>{
 const reviewSource=fs.readFileSync(new URL('../assets/js/enviaments.js',import.meta.url),'utf8');const nodes=[];let confirmed=false;
 const context={document:{getElementById:()=>null,createElement:tag=>{const n={tag,style:{},append(){},showModal(){},close(){},remove(){}};nodes.push(n);return n},body:{append(){}}}};
 vm.createContext(context);vm.runInContext(reviewSource,context);const pending=context.reviewApplication(snapshot,()=>{confirmed=true});nodes.find(n=>n.textContent==='Confirmar i connectar Gmail').onclick();assert.equal(confirmed,true);assert.equal(await pending,true);
});

test('late OAuth callback after timeout cannot send a stale reviewed application',()=>{
 const x=setup();let timeout,config;x.ctx.setTimeout=fn=>{timeout=fn};
 x.ctx.google={accounts:{oauth2:{initTokenClient:c=>{config=c;return {requestAccessToken(){}}}}}};x.ctx.window.google=x.ctx.google;
 x.ctx.authorizeReviewedGmail(snapshot);timeout();config.callback({access_token:'late-token'});
 assert.equal(x.elements.sendGmail.disabled,false);assert.equal(x.requests.length,0);assert.match(x.elements.gmailNotice.textContent,/No s’ha enviat/);
});

test('Gmail message includes an Arial 12 HTML version and keeps the plain text',async()=>{
 const ctx=vm.createContext({Date,TextEncoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),
   esc:s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')});
 vm.runInContext(source,ctx);
 const body='Bon dia,\n\nText <literal> & accent: à';
 const raw=await ctx.buildGmailRaw('prova@example.org','Candidatura',body,[]);
 const mime=Buffer.from(raw,'base64url').toString('utf8');
 assert.match(mime,/Content-Type: multipart\/alternative/);
 const parts=[...mime.matchAll(/Content-Type: text\/(plain|html);[^\r]*\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g)];
 const decoded=Object.fromEntries(parts.map(([,type,encoded])=>[type,Buffer.from(encoded,'base64').toString('utf8')]));
 assert.equal(decoded.plain,body);
 assert.equal(decoded.html,'<div style="font-family:Arial,sans-serif;font-size:12pt">Bon dia,<br><br>Text &lt;literal&gt; &amp; accent: à</div>');
});

test('connecting Gmail requests only send permission and never sends or records a candidature',async()=>{
 const x=setup();x.elements.connectGmailOnly={};let config;
 x.ctx.google={accounts:{oauth2:{initTokenClient:c=>{config=c;return {requestAccessToken(){c.callback({access_token:'synthetic-grant',expires_in:3600})}}}}}};x.ctx.window.google=x.ctx.google;
 x.ctx.connectGmailWithoutSending();
 assert.equal(config.scope,'https://www.googleapis.com/auth/gmail.send');assert.equal(config.include_granted_scopes,false);
 assert.equal(x.requests.length,0);assert.equal(x.statuses.length,0);assert.equal(x.saved.length,0);assert.match(x.elements.gmailNotice.textContent,/No s’ha enviat cap correu/);
 await x.ctx.authorizeReviewedGmail(snapshot);assert.equal(x.requests.length,1);assert.equal(x.saved.length,1);
});


test('Gmail mail-sending quota stores the retry time and blocks repeated sends without a sent history',async()=>{
 const x=setup(),retry=new Date(Date.now()+3600000).toISOString();let calls=0;
 x.ctx.fetch=async()=>{calls++;return {ok:false,status:429,json:async()=>({error:{message:'User-rate limit exceeded. Retry after '+retry+' (Mail sending)'}})}};
 await x.ctx.actuallySendGmail('synthetic-token',snapshot);
 assert.equal(calls,1);assert.equal(x.saved.length,0);assert.equal(x.statuses.filter(([key])=>key.startsWith('status_')).length,0);
 assert.match(x.elements.gmailNotice.textContent,/hora peninsular/);assert.match(x.elements.gmailNotice.textContent,/No es reintentarà automàticament/);
 await x.ctx.actuallySendGmail('synthetic-token',snapshot);assert.equal(calls,1,'no second Gmail API request while the retry time is active');
});
test('a persisted Gmail send limit survives a new page session without opening Google',()=>{
 const x=setup();x.ctx.localStorage.getItem=()=>String(Date.now()+3600000);x.ctx.authorizeReviewedGmail(snapshot);
 assert.equal(x.requests.length,0);assert.match(x.elements.gmailNotice.textContent,/Gmail limita temporalment/);
});
