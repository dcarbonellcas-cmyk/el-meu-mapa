// Read only the Gmail threads tied to confirmed application sends.
function calendarGmailReply(message, recipients) {
  const labels=message.labelIds||[];
  if(labels.some(label=>['SENT','DRAFT','TRASH','SPAM'].includes(label)))return false;
  const headers=new Map((message.payload?.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
  const from=calendarMailAddresses(headers.get('from'))[0];
  if(!from||!recipients.includes(from)||/^(?:no[._-]?reply|mailer-daemon|postmaster)@/.test(from))return false;
  const automatic=headers.get('auto-submitted');
  if(automatic&&automatic.toLowerCase().trim()!=='no')return false;
  if(headers.has('x-autoreply')||headers.has('x-autorespond')||headers.has('list-id'))return false;
  if(/^(bulk|list|junk)$/i.test(headers.get('precedence')||''))return false;
  return !/^(?:re:\s*)?(?:resposta autom[aà]tica|respuesta autom[aá]tica|automatic reply|out of office|acus[éeo] de rec|confirmaci[oó] de (recepci[oó]n|inscripci[oó]n)|delivery status notification)/i.test(headers.get('subject')||'');
}

function calendarMailAddresses(value='') {
  return [...String(value).toLowerCase().matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/g)].map(match=>match[0]);
}

(() => {
  let session=null, busy=false, rerun=false;
  const validId=id=>typeof id==='string'&&/^[a-z0-9]+$/i.test(id);
  const status=()=>document.getElementById('calendarGmailStatus');

  async function linkedSends(){
    const links=new Map();
    function remember(placeId, gmailId, threadId) {
      if(!placeId||!validId(gmailId)||!validId(threadId))return;
      const list=links.get(threadId)||new Map();
      list.set(gmailId,{placeId,gmailId});
      links.set(threadId,list);
    }
    for(const key of Object.keys(localStorage)){
      if(!key.startsWith('history_'))continue;
      for(const item of hist(key.slice(8))){
        if(item.type==='sent')remember(key.slice(8),item.gmailId,item.threadId);
      }
    }
    // Older confirmed sends only have Gmail IDs in the private local archive.
    const archived=await applicationArchive('get').catch(()=>[]);
    for(const item of archived)remember(String(item.id||''),item.gmailId,item.threadId);
    return links;
  }

  async function checkReplies() {
    if(!session||document.hidden)return;
    if(busy){rerun=true;return;}
    const current=session;
    if(Date.now()>=current.expires){
      session=null;
      status().textContent='La sessió de Gmail ha caducat. El calendari conserva les respostes que ja ha trobat.';
      return;
    }
    busy=true;
    let count=0, complete=true;
    try {
      const threads=await linkedSends();
      const metadata=new URLSearchParams({format:'metadata',fields:'messages(id,internalDate,labelIds,payload(headers))'});
      for(const header of ['From','To','Subject','Auto-Submitted','Precedence','List-Id','X-Autoreply','X-Autorespond']){
        metadata.append('metadataHeaders',header);
      }
      const checks=[...threads];
      for(let i=0;i<checks.length;i+=5){
        const batch=await Promise.allSettled(checks.slice(i,i+5).map(async ([threadId, sent])=>{
          const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads/'+threadId+'?'+metadata,{
            headers:{Authorization:'Bearer '+current.token},signal:AbortSignal.timeout(15000)
          });
          if(response.status===404)return;
          if(!response.ok)throw Error(String(response.status));
          const {messages=[]}=await response.json();
          if(current!==session)return;
          const originals=messages.filter(message=>sent.has(message.id)&&message.labelIds?.includes('SENT'))
            .sort((a,b)=>Number(b.internalDate)-Number(a.internalDate));
          for(const message of messages){
            const original=originals.find(candidate=>Number(candidate.internalDate)<Number(message.internalDate));
            if(!original||!validId(message.id))continue;
            const to=original.payload?.headers?.find(header=>header.name.toLowerCase()==='to')?.value;
            if(!calendarGmailReply(message,calendarMailAddresses(to)))continue;
            const {placeId}=sent.get(original.id);
            const history=hist(placeId);
            if(history.some(item=>item.gmailId===message.id))continue;
            const date=new Date(Number(message.internalDate));
            if(!Number.isFinite(date.getTime()))continue;
            const newest=history.find(item=>item.type==='sent');
            const originalAt=Number(original.internalDate);
            const matchesLatest=newest&&
              (newest.gmailId===original.id||Math.abs(Date.parse(newest.date)-originalAt)<60000);
            const entry={type:'replied',source:'gmail',text:'Resposta al fil de Gmail',
              date:date.toISOString(),gmailId:message.id,threadId,applicationSentAt:new Date(originalAt).toISOString()};
            localStorage.setItem('history_'+placeId,JSON.stringify([entry,...history].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))));
            if(matchesLatest&&state(placeId)!=='interview')localStorage.setItem('status_'+placeId,'replied');
            count++;
          }
        }));
        const failure=batch.find(result=>result.status==='rejected');
        if(failure) {
          complete=false;
          if(String(failure.reason?.message)==='401'&&session===current)session=null;
          break;
        }
      }
      if(count){
        document.dispatchEvent(new Event('candidature-history-changed'));
        document.dispatchEvent(new Event('private-data-changed'));
        window.__renderDash?.();
      }
      if(current===session||!session) {
        if(count)status().textContent=count===1?'1 resposta nova al calendari.':count+' respostes noves al calendari.';
        else if(!status().textContent.includes('nova'))status().textContent=threads.size?
          'Gmail connectat. Es revisen els fils de les candidatures registrades.':'Gmail connectat. Quan enviïs una candidatura des de l’app, en podràs veure les respostes aquí.';
        if(!complete)status().textContent+=' La revisió de Gmail s’ha interromput. Es conserven les respostes ja desades.';
      }
    }catch {
      status().textContent='No s’ha pogut revisar Gmail. Es conserven les respostes ja desades.';
    }finally {
      busy=false;
      if(rerun){rerun=false;checkReplies();}
    }
  }

  window.useCalendarGmailSession=(token,seconds)=>{
    session={token,expires:Date.now()+(Number(seconds)||3600)*1000-30000};
    checkReplies();
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReplies()});
  setInterval(checkReplies,300000);
})();
