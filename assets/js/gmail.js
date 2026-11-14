const GMAIL_CLIENT_ID='326278371839-alsvhik4agj0jqp6ps16ve3j722q6p2k.apps.googleusercontent.com';
const GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.send';
let gmailRetryAfter=0;
function gmailSendingWait(){
  try{gmailRetryAfter=Math.max(gmailRetryAfter,Number(localStorage.getItem?.('mapaGmailSendRetryAfter_v1'))||0)}catch{}
  if(Date.now()>=gmailRetryAfter)return '';
  const when=new Date(gmailRetryAfter).toLocaleString('ca-ES',{timeZone:'Europe/Madrid',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  return 'Gmail limita temporalment els enviaments del teu compte. Google indica que esperis fins al '+when+' (hora peninsular), però el bloqueig pot durar més. No es reintentarà automàticament.';
}
function rememberGmailSendingLimit(detail){
  const timestamp=detail.match(/Retry after\s+(\d{4}-\d{2}-\d{2}T[0-9:.]+Z)/i)?.[1];
  const until=Date.parse(timestamp);if(!Number.isFinite(until)||until<=Date.now())return '';
  gmailRetryAfter=until;try{localStorage.setItem('mapaGmailSendRetryAfter_v1',String(until))}catch{}
  return gmailSendingWait();
}
let gmailTokenClient=null;
let gmailGrantedToken='',gmailGrantedUntil=0;
function rememberGmailAccess(response){gmailGrantedToken=response.access_token;gmailGrantedUntil=Date.now()+Math.max(0,Number(response.expires_in||3600)-60)*1000}
function gmailNotice(msg,ok=false){
  const n=document.getElementById('gmailNotice'); n.textContent=msg; n.style.display='block';
  n.style.background=ok?'#edf8f1':'#fff4e5'; n.style.color=ok?'#27613a':'#8a5315';
}
function bytesToBase64(bytes){let bin='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(bin)}
function base64urlUtf8(text){return bytesToBase64(new TextEncoder().encode(text)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function encodedHeader(text){return '=?UTF-8?B?'+bytesToBase64(new TextEncoder().encode(text))+'?='}
function blobBase64(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(r.error);r.readAsDataURL(blob)})}
async function buildGmailRaw(to,subject,body,docs){
  const boundary='----MapaEscoles_'+Date.now();
  let mime='MIME-Version: 1.0\r\nTo: '+to+'\r\nSubject: '+encodedHeader(subject)+'\r\nContent-Type: multipart/mixed; boundary="'+boundary+'"\r\n\r\n';
  const alternative=boundary+'_alternative';
  const html='<div style="font-family:Arial,sans-serif;font-size:12pt">'+esc(body).replace(/\r\n|\r|\n/g,'<br>')+'</div>';
  const encodePart=text=>bytesToBase64(new TextEncoder().encode(text)).replace(/.{1,76}/g,'$&\r\n');
  mime+='--'+boundary+'\r\nContent-Type: multipart/alternative; boundary="'+alternative+'"\r\n\r\n';
  for(const [type,text] of [['plain',body],['html',html]]){
    mime+='--'+alternative+'\r\nContent-Type: text/'+type+'; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n'+encodePart(text);
  }
  mime+='--'+alternative+'--\r\n';
  for(const d of docs){
    const b64=await blobBase64(d.blob); const safe=(d.name||'document').replace(/["\r\n]/g,'_');
    mime+='--'+boundary+'\r\nContent-Type: '+(d.type||'application/octet-stream')+'; name="'+safe+'"\r\nContent-Disposition: attachment; filename="'+safe+'"\r\nContent-Transfer-Encoding: base64\r\n\r\n'+b64.replace(/(.{76})/g,'$1\r\n')+'\r\n';
  }
  mime+='--'+boundary+'--'; return base64urlUtf8(mime);
}
async function actuallySendGmail(accessToken,snapshot){
  let delivered=false;
  const btn=document.getElementById('sendGmail');
  try{
    const waiting=gmailSendingWait();if(waiting)throw Error(waiting);
    const {to,subject,body,docs,id}=snapshot;
    gmailNotice('Enviant candidatura…');
    const raw=await buildGmailRaw(to,subject,body,docs);
    const res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({raw})});
    if(!res.ok){let detail='';try{detail=(await res.json()).error?.message||''}catch(e){};if(res.status===429&&/Mail sending/i.test(detail)){const waiting=rememberGmailSendingLimit(detail);if(waiting)throw Error(waiting)}throw new Error(detail||('Error de Gmail ('+res.status+')'))}
    delivered=true; const receipt=await res.json();
    localStorage.setItem('status_'+id,'sent'); addHist(id,'sent',lastSent(id)?'CV renovat i enviat amb Gmail':'CV enviat amb Gmail',{gmailId:receipt.id,threadId:receipt.threadId});
    await applicationArchive('put',{gmailId:receipt.id,threadId:receipt.threadId,id,centre:snapshot.centre,role:snapshot.role,to,subject,body,sentAt:new Date().toISOString(),attachments:docs.map(d=>({name:d.name,type:d.type,size:d.blob.size}))});
    await renderSentArchive();
    gmailNotice('✓ Candidatura enviada correctament amb Gmail.',true); btn.textContent='✓ Enviat';
    if(typeof draw==='function') draw(); if(typeof drawMap==='function') drawMap(); if(typeof window.__renderLeisure==='function') window.__renderLeisure(); if(typeof select==='function' && !String(currentDraftSchoolId).startsWith('lleure_')) setTimeout(()=>select(currentDraftSchoolId),700);
  }catch(err){gmailNotice((delivered?'Gmail ha enviat la candidatura, però no s’ha pogut guardar la còpia local. No la tornis a enviar: ':'No s’ha enviat: ')+(err.message||err),delivered);btn.disabled=delivered;btn.textContent=delivered?'✓ Enviat':'✉ Enviar amb Gmail'}
}
let sendReviewBusy=false;
async function sendWithGmail(){
  const waiting=gmailSendingWait();if(waiting){gmailNotice(waiting);return}
  if(sendReviewBusy)return;
  const draft=document.getElementById('draftSubject').value+' '+document.getElementById('draftBody').value;
  if(draft.includes('[El teu nom]')||draft.includes('[La teva formació i experiència]')||draft.includes('[Completa l’experiència')){gmailNotice('Completa el teu nom i formació a Documents o edita l’esborrany abans d’enviar.');return}

  let snapshot;sendReviewBusy=true;
  try{
    const id=String(currentDraftSchoolId),place=[...schools,...LEISURE_ENTITIES,...(typeof INFANT_ENTITIES!=='undefined'?INFANT_ENTITIES:[])].find(x=>String(x.id)===id);
    snapshot={id,centre:place?.name||document.getElementById('draftSubject').value,role:document.getElementById('draftRole').selectedOptions[0]?.textContent||'',to:document.getElementById('draftTo').value.trim(),subject:document.getElementById('draftSubject').value,body:document.getElementById('draftBody').value,docs:await candidatureDocuments()};
    if(!snapshot.to||/[\r\n]/.test(snapshot.to))throw new Error('Correu del destinatari no vàlid.');
    const last=hist(id).find(x=>x.type==='sent');
    if(last&&!confirm('Ja consta un enviament el '+fmt(last.date)+'. Vols preparar un altre enviament?'))return;
    await reviewApplication(snapshot,()=>authorizeReviewedGmail(snapshot));
  }catch(e){gmailNotice(e.message);return}finally{sendReviewBusy=false}
}
function authorizeReviewedGmail(snapshot){
  const waiting=gmailSendingWait();if(waiting){gmailNotice(waiting);return}
  if(gmailGrantedToken&&Date.now()<gmailGrantedUntil){const button=document.getElementById('sendGmail');button.disabled=true;return actuallySendGmail(gmailGrantedToken,snapshot)}
  const btn=document.getElementById('sendGmail'); btn.disabled=true; btn.textContent='Connectant amb Gmail…'; gmailNotice('Autoritza el teu compte de Gmail a la finestra de Google.');
  if(!(window.google&&google.accounts&&google.accounts.oauth2)){gmailNotice('Google encara no s’ha carregat. Espera uns segons i torna-ho a provar.');btn.disabled=false;btn.textContent='✉ Enviar amb Gmail';return}
  let authDone=false;const authTimer=setTimeout(()=>{if(authDone)return;authDone=true;gmailNotice('Google no ha completat la connexió. Permet les finestres emergents i torna-ho a provar. No s’ha enviat cap correu.');btn.disabled=false;btn.textContent='✉ Enviar amb Gmail'},60000);
  try{
    gmailTokenClient=google.accounts.oauth2.initTokenClient({client_id:GMAIL_CLIENT_ID,scope:GMAIL_SCOPE,include_granted_scopes:false,error_callback:(err)=>{if(authDone)return;authDone=true;clearTimeout(authTimer);gmailNotice(err?.type==='popup_closed'?'Has tancat la finestra de Google. No s’ha enviat cap correu.':'No s’ha pogut obrir Google. Obre aquesta web amb Safari o Chrome i permet les finestres emergents, o fes servir «Enviar des de l’app de correu». No s’ha enviat cap correu.');btn.disabled=false;btn.textContent='✉ Enviar amb Gmail'},callback:(resp)=>{if(authDone)return;authDone=true;clearTimeout(authTimer);if(resp.error||!resp.access_token){gmailNotice('No s’ha pogut autoritzar Gmail: '+resp.error);btn.disabled=false;btn.textContent='✉ Enviar amb Gmail';return}rememberGmailAccess(resp);actuallySendGmail(resp.access_token,snapshot)}});
    gmailTokenClient.requestAccessToken({prompt:''});
  }catch(err){authDone=true;clearTimeout(authTimer);gmailNotice('No s’ha pogut iniciar Google: '+err.message+'. No s’ha enviat cap correu.');btn.disabled=false;btn.textContent='✉ Enviar amb Gmail'}
}
function connectGmailWithoutSending(){
  const button=document.getElementById('connectGmailOnly');
  if(!(window.google&&google.accounts&&google.accounts.oauth2)){gmailNotice('Google encara s’està carregant. Espera uns segons.');return}
  button.disabled=true;let finished=false;
  const finish=()=>{if(finished)return false;finished=true;clearTimeout(timeout);button.disabled=false;return true};
  const timeout=setTimeout(()=>{if(finish())gmailNotice('Google no ha completat l’autorització. No s’ha enviat cap correu.')},60000);
  gmailNotice('Google et demanarà permís per enviar correus. Aquesta connexió no envia cap candidatura.');
  try{
    const client=google.accounts.oauth2.initTokenClient({client_id:GMAIL_CLIENT_ID,scope:GMAIL_SCOPE,include_granted_scopes:false,
      error_callback:()=>{if(finish())gmailNotice('Connexió cancel·lada. No s’ha enviat cap correu.')},
      callback:response=>{if(!finish())return;if(response.error||!response.access_token){gmailNotice('Google no ha autoritzat l’accés. No s’ha enviat cap correu.');return}rememberGmailAccess(response);button.textContent='✓ Gmail connectat';gmailNotice('Gmail autoritzat per a aquesta sessió. No s’ha enviat cap correu. Ara pots revisar la candidatura i prémer Enviar amb Gmail.',true)}
    });client.requestAccessToken({prompt:''});
  }catch(error){if(finish())gmailNotice('No s’ha pogut connectar amb Google. No s’ha enviat cap correu.')}
}
document.getElementById('sendGmail').addEventListener('click',sendWithGmail);
document.getElementById('connectGmailOnly')?.addEventListener('click',connectGmailWithoutSending);

(function(){
  const CLIENT_ID='326278371839-alsvhik4agj0jqp6ps16ve3j722q6p2k.apps.googleusercontent.com';
  const READ_SCOPE='https://www.googleapis.com/auth/gmail.readonly';
  const btn=document.getElementById('syncJobsBtn'), notice=document.getElementById('jobsSyncNotice');
  function say(msg,ok=false){if(!notice)return;notice.style.display='block';notice.textContent=msg;notice.style.background=ok?'#edf8f1':'#eef6ff';notice.style.color=ok?'#27613a':'#365d91'}
  function b64url(s){s=(s||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';try{const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return new TextDecoder('utf-8').decode(bytes)}catch(e){return ''}}
  function parts(payload,out=[]){if(!payload)return out;if(payload.body?.data)out.push({type:payload.mimeType||'',text:b64url(payload.body.data)});(payload.parts||[]).forEach(x=>parts(x,out));return out}
  function clean(t){const d=document.createElement('div');d.innerHTML=t||'';return (d.textContent||'').replace(/\s+/g,' ').trim()}
  function sourceOf(from,subject){const x=(from+' '+subject).toLowerCase();if(x.includes('linkedin'))return 'LinkedIn';if(x.includes('infojobs'))return 'InfoJobs';if(x.includes('indeed'))return 'Indeed';if(x.includes('b4work'))return 'B4work';return ''}
  function externalUrl(href,source){try{const u=new URL(href);const raw=decodeURIComponent(href);if(/unsubscribe|privacy|settings|preferences|help|support|login|signup/i.test(raw))return '';if(source==='LinkedIn' && /(linkedin\.com\/comm\/jobs\/view|linkedin\.com\/jobs\/view)/i.test(raw))return href;if(source==='Indeed' && /(indeed\.[^/]+\/viewjob|indeed\.[^/]+\/rc\/clk|indeed\.com\/viewjob)/i.test(raw))return href;if(source==='InfoJobs' && /(infojobs\.net\/[^\s"']*(oferta|job|empleo)|infojobs\.net\/ofertas-trabajo)/i.test(raw))return href;if(source==='B4work' && /b4work\.com/i.test(raw))return href;return ''}catch(e){return ''}}
  function offersFromMessage(m){const hs={};(m.payload?.headers||[]).forEach(h=>hs[h.name.toLowerCase()]=h.value);const source=sourceOf(hs.from||'',hs.subject||'');if(!source)return[];const ps=parts(m.payload),html=ps.filter(x=>x.type.includes('html')).map(x=>x.text).join('\n');const plain=ps.filter(x=>x.type.includes('plain')).map(x=>x.text).join('\n');const found=[];
    if(html){const d=document.createElement('div');d.innerHTML=html;[...d.querySelectorAll('a[href]')].forEach(a=>{const url=externalUrl(a.href,source),title=clean(a.innerHTML);if(url&&title&&title.length>3&&title.length<180)found.push({url,title})})}
    if(!found.length){const text=plain+' '+(m.snippet||'');const urls=text.match(/https?:\/\/[^\s<>"']+/g)||[];urls.forEach(u=>{const url=externalUrl(u,source);if(url)found.push({url,title:hs.subject||'Oferta de feina'})})}
    const uniq=new Map();found.forEach(x=>uniq.set(x.url,x));if(!uniq.size && (hs.subject||m.snippet))uniq.set('gmail:'+m.id,{url:'',title:hs.subject||'Alerta de feina'});
    return [...uniq.values()].slice(0,20).map(x=>({id:'gmail_'+m.id+'_'+Math.abs(hash(x.url||x.title)),title:x.title||hs.subject||'Oferta de feina',school:'',city:'',source,url:x.url,status:'saved',date:new Date(Number(m.internalDate)||Date.now()).toISOString(),gmailId:m.id,snippet:clean(m.snippet||'')}));
  }
  function hash(s){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h)+s.charCodeAt(i)|0;return h}
  async function api(token,path){const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+token}});if(!r.ok){let x={};try{x=await r.json()}catch(e){};throw new Error(x.error?.message||('Gmail '+r.status))}return r.json()}
  async function sync(token){say('Buscant alertes recents de LinkedIn, InfoJobs, Indeed i B4work…');const queries=['newer_than:60d from:linkedin.com','newer_than:60d from:indeed.com','newer_than:60d from:infojobs.net','newer_than:60d from:infojobs.com','newer_than:60d b4work'];let ids=[];for(const qq of queries){const list=await api(token,'messages?maxResults=75&q='+encodeURIComponent(qq));ids.push(...(list.messages||[]).map(x=>x.id))}ids=[...new Set(ids)];if(!ids.length){say('No he trobat alertes de LinkedIn, Indeed, InfoJobs o B4work dels últims 60 dies. Les ofertes públiques verificades continuen visibles igualment.',true);return}
    let imported=[];for(let i=0;i<ids.length;i+=10){const batch=ids.slice(i,i+10);const msgs=await Promise.all(batch.map(id=>api(token,'messages/'+id+'?format=full')));msgs.forEach(m=>imported.push(...offersFromMessage(m)));say('Llegint alertes… '+Math.min(i+10,ids.length)+'/'+ids.length)}
    const old=JSON.parse(localStorage.getItem('mapaEscolesJobs_v1')||'[]'), keys=new Set(old.map(j=>j.url||j.id));let added=0;for(const j of imported){const k=j.url||j.id;if(!keys.has(k)){old.unshift(j);keys.add(k);added++}}localStorage.setItem('mapaEscolesJobs_v1',JSON.stringify(old));if(window.__renderJobs)window.__renderJobs();say('✓ Actualització acabada: '+added+' oferta'+(added===1?'':'es')+' nova'+(added===1?'':'es')+'.',true)
  }
  async function start(){try{await window.__syncLiveJobSources?.(false)}catch(e){}if(!(window.google&&google.accounts&&google.accounts.oauth2)){say('Google encara s’està carregant. Espera uns segons i torna-ho a provar.');return}btn.disabled=true;btn.textContent='Connectant amb Gmail…';const tc=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:READ_SCOPE,error_callback:()=>{btn.disabled=false;btn.textContent='🔄 Actualitzar ofertes';say('Connexió cancel·lada o finestra bloquejada. Les ofertes guardades es conserven.')},callback:async r=>{try{if(r.error||!r.access_token)throw new Error(r.error||'Autorització absent');window.useCalendarGmailSession?.(r.access_token,r.expires_in);await sync(r.access_token)}catch(e){say('No s’han pogut actualitzar les ofertes: '+(e.message||e))}finally{btn.disabled=false;btn.textContent='🔄 Actualitzar ofertes'}}});try{tc.requestAccessToken({prompt:''})}catch(e){btn.disabled=false;btn.textContent='🔄 Actualitzar ofertes';say('No s’ha pogut obrir Google. Torna-ho a provar des de Safari o Chrome.')}}
  btn?.addEventListener('click',start);
})();
