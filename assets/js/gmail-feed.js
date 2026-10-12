(function(){
 const output=document.getElementById('gmailFeedStatus');let key=null;
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 async function refresh(){
  if(!key)return;
  try{
   const response=await fetch('assets/data/gmail-xifrat.json',{cache:'no-store'});if(!response.ok)throw Error();const envelope=await response.json();
   if(envelope.version!==1)throw Error();
   const value=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(envelope.iv),additionalData:new TextEncoder().encode('el-meu-mapa-gmail-v1')},key,bytes(envelope.ciphertext));
   const data=JSON.parse(new TextDecoder().decode(value));
   const old=JSON.parse(localStorage.getItem('mapaEscolesJobs_v1')||'[]'),by=new Map(old.map(x=>[x.id,x]));
   for(const job of data.jobs){if(!job.privateFeed||!/^https:\/\//.test(job.url))continue;by.set(job.id,{...job,status:by.get(job.id)?.status||'saved'});}
   localStorage.setItem('mapaEscolesJobs_v1',JSON.stringify([...by.values()]));window.__renderJobs?.();output.textContent=' Alertes privades: '+new Date(data.updatedAt).toLocaleString('ca-ES');
  }catch{output.textContent=' No s’han pogut obrir les alertes. Comprova la connexió i la clau privada.';}
 }
 document.getElementById('unlockGmailFeed')?.addEventListener('click',async()=>{
  const response=await fetch('assets/data/sincronitzacio.json',{cache:'no-store'});const status=await response.json();
  if(status.sources.gmail?.state==='pending'){output.textContent=' Encara falta completar l’autorització de Google i la connexió privada.';return;}
  const value=prompt('Clau privada de les alertes (no la comparteixis):');if(!value)return;
  try{const raw=bytes(value.trim());if(raw.length!==32)throw Error();key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);await refresh();}catch{output.textContent=' Clau no vàlida.';}
 });
 setInterval(()=>{if(!document.hidden)refresh()},600000);
})();
