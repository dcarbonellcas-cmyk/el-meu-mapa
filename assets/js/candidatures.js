const dashboardGmailIndex='gmail_sent_index';

function dashboardSentIndex(){
  return hist(dashboardGmailIndex).filter(item=>item.type==='gmail_sent_index');
}

function mergeDashboardSentIndex(snapshot,existing,knownPlaces){
  if(snapshot?.version!==1||snapshot.kind!=='gmail-sent-index'||!Array.isArray(snapshot.items)||snapshot.items.length>10000){
    throw Error('El fitxer no és un historial de Gmail vàlid.');
  }
  const byId=new Map(existing.map(item=>[item.gmailId,item]));
  for(const item of snapshot.items){
    if(!item||!(/^[0-9a-f]{16}$/i).test(item.gmailId)||!Number.isFinite(Date.parse(item.date))||
      !(item.placeId===null||knownPlaces.has(item.placeId))){
      throw Error('El fitxer conté un enviament no vàlid.');
    }
    if(item.threadId!==undefined&&!(typeof item.threadId==='string'&&/^[a-z0-9]{1,100}$/i.test(item.threadId)))throw Error('El fil de Gmail no és vàlid.');
    if(item.placeName!==undefined&&!(typeof item.placeName==='string'&&item.placeName.length<=500))throw Error('El nom del centre no és vàlid.');
    const previous=byId.get(item.gmailId);
    byId.set(item.gmailId,{type:'gmail_sent_index',text:'Correu de candidatura a Gmail',date:new Date(item.date).toISOString(),
      gmailId:item.gmailId,placeId:item.placeId||previous?.placeId||null,threadId:item.threadId||previous?.threadId||item.gmailId,placeName:item.placeName||previous?.placeName||''});
  }
  return [...byId.values()].sort((a,b)=>b.date.localeCompare(a.date));
}

function dashboardInterviewDetails(place,records){
  const matches=interviewsForPlace(place,records);
  const interview=matches.find(item=>item.completed)||matches[0];
  if(!interview)return null;
  return {interview,label:(interview.completed?'Entrevista realitzada':'Entrevista programada')+' · '+({pending:'Pendent de resposta',favorable:'Resposta favorable',unfavorable:'Resposta desfavorable'}[interview.outcome]||'Pendent de resposta')};
}

(function(){
  const statuses = ["No contactada","CV preparat","CV enviat","Toca renovar candidatura","Han contestat","Entrevista"];
  const statusColors = {"No contactada":"#b9c6d8","CV preparat":"#f5a623","CV enviat":"#16a34a","Toca renovar candidatura":"#f59e0b","Han contestat":"#7b4de2","Entrevista":"#ec4b91"};

  function allSchools(){
    if(window.MAPA_DATA) return [...window.MAPA_DATA.centres,...(window.MAPA_DATA.archived||[]).filter(s=>localStorage.getItem('status_'+s.id)||localStorage.getItem('history_'+s.id)||dashboardSentIndex().some(item=>String(item.placeId)===String(s.id))).map(s=>({...s,name:s.name+' · no consta al directori actual d’infantil'})),
      ...window.MAPA_DATA.entitats.infantil.map(s=>({...s,dashScope:'gestora'})),
      ...window.MAPA_DATA.entitats.lleure.map(s=>({...s,dashScope:'lleure'}))];
    if (Array.isArray(window.SCHOOLS)) return window.SCHOOLS;
    if (typeof schools !== "undefined" && Array.isArray(schools)) return schools;
    if (typeof CENTRES !== "undefined" && Array.isArray(CENTRES)) return CENTRES;
    return [];
  }
  function sid(s){ return String(s.id ?? s.code ?? s.codi ?? ""); }
  function stateFor(s,imported){
    const id=sid(s);
    const key=localStorage.getItem("status_"+id)||"none";
    const labels={none:"No contactada",prepared:"CV preparat",sent:"CV enviat",replied:"Han contestat",interview:"Entrevista"};
    let h=[]; try{h=JSON.parse(localStorage.getItem("history_"+id)||"[]")}catch(e){}
    const local=h.find(x=>x.type==='sent');
    const gmail=imported.get(id);
    const last=local&&(!gmail||Date.parse(local.date)>=Date.parse(gmail.date))?local:gmail;
    let label=labels[key]||'No contactada';
    if(last&&['none','prepared'].includes(key))label='CV enviat';
    const tracking=trackingForPlace(s);
    if(tracking.bucket==='renew')label='Toca renovar candidatura';
    const details=dashboardInterviewDetails(s,calendarInterviewAppointments()),interview=details?.interview;
    if(interview)label='Entrevista';
    const interviewLabel=details?.label||'';
    return {status:label,displayStatus:interviewLabel||label,hasSent:!!last||key==='sent',source:last?.source,date:interview&&!interview.dateUnknown?applicationCalendarDay.format(new Date(interview.date)):last?.date||h[0]?.date||'',reminderMonth:interview?.reminderMonth};
  }
  function val(s, keys, fallback=""){
    for(const k of keys) if(s && s[k]!==undefined && s[k]!==null && String(s[k]).trim()!=="") return s[k];
    return fallback;
  }
  function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

  function render(){
    const data=allSchools();
    const counts=Object.fromEntries(statuses.map(x=>[x,0]));
    const index=dashboardSentIndex(), imported=new Map(), gmailIds=new Set(index.map(x=>x.gmailId));
    for(const item of index)if(item.placeId&&(!imported.has(item.placeId)||item.date>imported.get(item.placeId).date))imported.set(item.placeId,item);
    const rowsById=new Map(data.map(s=>[sid(s),stateFor(s,imported)]));
    for(const st of rowsById.values()){
      if(st.status!=='CV enviat')counts[st.status]++;
      if(st.hasSent)counts['CV enviat']++;
    }
    for(const place of data)for(const item of hist(sid(place)))if(item.type==='sent'&&item.gmailId)gmailIds.add(item.gmailId);
    counts['Entrevista']=calendarInterviewAppointments().length;
    const total=document.getElementById('dashMailTotal');
    total.textContent=gmailIds.size+' correus de candidatura a Gmail registrats. «CV enviat» compta centres i entitats amb almenys un enviament registrat.';
    const sf=document.getElementById("dashStatus").value;
    const cards=document.getElementById("dashCards");
    cards.innerHTML=statuses.map(st=>`<button class="dashCard" data-status="${st}" aria-pressed="${st===sf}">
      <div style="width:10px;height:10px;border-radius:50%;background:${statusColors[st]};margin-bottom:10px"></div>
      <div style="font-size:26px;font-weight:800">${counts[st]||0}</div><div class="dashCardLabel">${st==='Entrevista'?'Entrevistes al calendari':st}</div></button>`).join("");

    const q=(document.getElementById("dashSearch").value||"").toLowerCase();
    const rows=data.filter(s=>{
      const entry=rowsById.get(sid(s)),st=entry.status;
      const hay=(val(s,["name","nom","Denominació_completa"])+" "+val(s,["city","municipality","municipi","Nom_municipi"])).toLowerCase();
      const scope=document.getElementById('dashScope')?.value||''; return (!scope||scope===(s.dashScope||'infantil')) && (!q||hay.includes(q)) && (!sf||(sf==='CV enviat'?entry.hasSent:st===sf)) && (st!=="No contactada" || sf==="No contactada");
    });
    const tbody=document.getElementById("dashRows");
    tbody.innerHTML=rows.slice(0,1000).map(s=>{
      const st=rowsById.get(sid(s));
      const type=val(s,["kind","type","tipus"],"");
      const stage=val(s,["stage","age","etapa"],"");
      return `<tr style="border-top:1px solid #edf1f7">
        <td style="padding:12px 10px;font-weight:700">${esc(val(s,["name","nom","Denominació_completa"],"Centre"))}</td>
        <td>${esc(val(s,["city","municipality","municipi","Nom_municipi"],""))}</td>
        <td>${esc(type)}</td><td>${esc(stage)}</td>
        <td><span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${statusColors[st.status]}22;color:#173b72;font-weight:700;font-size:12px">${esc(st.displayStatus)}</span>${st.reminderMonth?'<small> · Tornar a contactar: '+esc(st.reminderMonth)+'</small>':''}${st.source==='website'?'<small> · Confirmada per tu · web</small>':''}</td>
        <td style="color:#7183a4">${esc(st.date||"—")}</td>
        <td><button class="openSchoolDash" data-id="${esc(sid(s))}" style="border:0;background:var(--lilac);color:var(--plum);border-radius:9px;padding:7px 10px;cursor:pointer;font-weight:700">Obrir</button></td>
      </tr>`;
    }).join("");
    document.getElementById("dashEmpty").style.display=rows.length?"none":"block";
    tbody.style.display=rows.length?"table-row-group":"none";
  }

  document.getElementById('dashImportSent').addEventListener('change',async event=>{
    const input=event.target,file=input.files[0];
    if(!file)return;
    const status=document.getElementById('dashImportStatus');
    try{
      if(file.size>1500000)throw Error('El fitxer és massa gran.');
      const known=new Set([...allSchools().map(sid),...(window.MAPA_DATA.archived||[]).map(sid),...privatePortalRows(localStorage).map(row=>String(row.id))]);
      const items=mergeDashboardSentIndex(JSON.parse(await file.text()),dashboardSentIndex(),known);
      localStorage.setItem('history_'+dashboardGmailIndex,JSON.stringify(items));
      status.textContent='Historial privat importat: '+items.length+' correus a Gmail.';
      document.dispatchEvent(new Event('private-data-changed'));
      document.dispatchEvent(new Event('candidature-history-changed'));
      render();
    }catch(error){status.textContent=error.message;}
    finally{input.value='';}
  });
  for(const event of ['candidature-history-changed','private-data-restored']){
    document.addEventListener(event,()=>{if(document.getElementById('dashboardOverlay').style.display==='block')render()});
  }
  window.__renderDash=render;
  function openDash(){document.getElementById("dashboardOverlay").style.display="block";render();}
  function closeDash(){document.getElementById("dashboardOverlay").style.display="none";}

  document.getElementById("dashboardBtn")?.addEventListener("click",openDash);
  document.getElementById("closeDashboard")?.addEventListener("click",closeDash);
  document.getElementById("dashSearch")?.addEventListener("input",render);
  document.getElementById("dashStatus")?.addEventListener("change",render);
  document.getElementById("dashCards")?.addEventListener("click",e=>{
    const b=e.target.closest(".dashCard"); if(!b)return;
    document.getElementById("dashStatus").value=b.dataset.status; render();
  });
  document.getElementById("dashRows")?.addEventListener("click",e=>{
    const b=e.target.closest(".openSchoolDash"); if(!b)return;
    const id=String(b.dataset.id); closeDash();
    const s=allSchools().find(x=>sid(x)===id);
    if(!s)return;
    if(s.careers||s.dashScope&&s.web){window.open(s.careers||s.web,'_blank','noopener');return;}
    if(typeof window.openSchool==="function") window.openSchool(id);
    else if(typeof openSchool==="function") openSchool(id);
    else {
      const card=document.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if(card) card.click();
    }
  });
})();
