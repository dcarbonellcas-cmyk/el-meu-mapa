// The calendar projects private tracking into dates in Europe/Madrid.
const applicationCalendarZone = 'Europe/Madrid';
const applicationCalendarDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: applicationCalendarZone, year:'numeric', month:'2-digit', day:'2-digit'
});

function calendarRenewalDay(day) {
  const [year, month, number] = day.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(number, lastDay))).toISOString().slice(0, 10);
}

function applicationCalendarEvents(place, history, status) {
  const items = (Array.isArray(history) ? history : [])
    .filter(item => Number.isFinite(Date.parse(item?.date)))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const sent = [...new Map(items.filter(item => item.type === 'sent').map(item=>[item.gmailId?'gmail:'+item.gmailId:'date:'+new Date(item.date).toISOString(),item])).values()];
  const events = sent.map(item => ({
    type:'sent', date:applicationCalendarDay.format(new Date(item.date)),
    title:'Candidatura enviada · ' + place.name,
    id:'sent|'+place.id+'|'+(item.gmailId||new Date(item.date).toISOString()),placeId:String(place.id),
    placeName:place.name,city:place.city||'',sentAt:item.date,gmailId:item.gmailId,threadId:item.threadId
  }));
  const replies = items.filter(item => item.type === 'replied' ||
    (item.type === 'status' && /Estat canviat a Han contestat/.test(item.text)));
  for (const reply of replies) {
    events.push({
      type:'reply', date:applicationCalendarDay.format(new Date(reply.date)),
      title:'Resposta de candidatura · ' + place.name, threadId:reply.threadId,
      id:'reply|'+place.id+'|'+(reply.gmailId||reply.date)
    });
  }
  const last = sent.at(-1);
  if (!last) return events;
  const outcomes = items.filter(item => ['replied','delivery_failed','interview','rejected'].includes(item.type) ||
    (item.type === 'status' && /Estat canviat a (Han contestat|Entrevista)/.test(item.text)));
  const resolved = outcomes.some(item => Date.parse(item.date) >= Date.parse(last.date) &&
    (!item.applicationSentAt || Math.abs(Date.parse(item.applicationSentAt)-Date.parse(last.date)) < 60000));
  const legacyOutcome = !outcomes.length && ['replied','interview','rejected'].includes(status);
  if (!resolved && !legacyOutcome) {
    events.push({
      type:'renewal', date:calendarRenewalDay(applicationCalendarDay.format(new Date(last.date))),
      title:'Revisar candidatura · ' + place.name,id:'renewal|'+place.id+'|'+last.date
    });
  }
  return events;
}

// Read all confirmed send sources without modifying their private records.
function calendarApplicationSources(data,histories,sentIndex=[],portals=[],legacyRows=[],statuses={}){
  const canonical=id=>({xarxa_fep:'xarxa_fecc',xarxa_manyanet:'xarxa_borsadocent'}[String(id)]||String(id));
  const places=new Map(),rows=new Map();
  const addPlace=place=>{const id=canonical(place.id);if(!places.has(id))places.set(id,{...place,id});return id};
  for(const place of [...(data.centres||[]),...(data.archived||[]),...(data.entitats?.infantil||[]),...(data.entitats?.lleure||[]),...portals])addPlace(place);
  const add=(id,item)=>{id=canonical(id);const list=rows.get(id)||[];list.push(item);rows.set(id,list)};
  for(const [original,history] of Object.entries(histories)){
    if(original==='calendar_interviews'||original==='gmail_sent_index'||!Array.isArray(history))continue;
    const id=canonical(original);
    if(!places.has(id)){
      const name=history.find(item=>item.placeName)?.placeName;
      addPlace({id,name:name||'Centre pendent d’identificar'});
    }
    for(const item of history)add(id,item);
  }
  for(const item of sentIndex){
    if(!Number.isFinite(Date.parse(item.date)))continue;
    const linked=[...rows].find(([,history])=>history.some(row=>row.type==='sent'&&row.gmailId&&row.gmailId===item.gmailId))?.[0];
    const id=canonical(item.placeId||linked||'gmail_'+item.gmailId);
    if(!places.has(id))addPlace({id,name:item.placeName||'Centre pendent d’identificar'});
    add(id,{...item,type:'sent',source:'gmail'});
  }
  for(const item of legacyRows){
    if(!item.sentDate||!Number.isFinite(Date.parse(item.sentDate)))continue;
    const id=canonical(item.matchedId||'legacy_'+JSON.stringify([item.name,item.city||'']));
    if(!places.has(id))addPlace({id,name:item.name,city:item.city});
    const day=applicationCalendarDay.format(new Date(item.sentDate));
    if((rows.get(id)||[]).some(row=>row.type==='sent'&&Number.isFinite(Date.parse(row.date))&&applicationCalendarDay.format(new Date(row.date))===day))continue;
    add(id,{type:'sent',date:item.sentDate,text:'Enviament importat de l’historial antic'});
  }
  const events=[];let undated=0;
  for(const [id,place] of places){
    const history=rows.get(id)||[];
    const status=statuses[id]||Object.entries(statuses).find(([key])=>canonical(key)===id)?.[1]||'none';
    if(status==='sent'&&!history.some(item=>item.type==='sent'&&Number.isFinite(Date.parse(item.date))))undated++;
    events.push(...applicationCalendarEvents(place,history,status).filter(event=>!(id.startsWith('gmail_')&&event.type==='renewal')));
  }
  return {events,undated};
}

function calendarMonthFollowUps(interviews,month){
  // A month is not an appointment date: never assign an invented day or time.
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return [];
  return interviews.filter(item=>item.reminderMonth===month);
}

function calendarInterviewAppointments(){
  const interviews=hist('calendar_interviews').filter(item=>item.type==='interview'&&Number.isFinite(Date.parse(item.date)));
  return [...new Map(interviews.map(item=>[item.interviewId||JSON.stringify([new Date(item.date).toISOString(),norm(item.text).trim()]),item])).values()];
}

(() => {
  const byId=id=>document.getElementById(id);
  const page=byId('calendarPage'), grid=byId('calendarGrid'), eventList=byId('calendarEvents');
  const status=byId('calendarStatus'), dayDialog=byId('calendarDayDialog');
  const form=byId('calendarInterviewForm'), formStatus=byId('calendarFormStatus');
  const zone=applicationCalendarZone;
  const dayFormat=applicationCalendarDay;
  const clockFormat=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const offsetFormat=new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'longOffset'});
  const monthFormat=new Intl.DateTimeFormat('ca-ES',{month:'long',year:'numeric',timeZone:'UTC'});
  const fullDateFormat=new Intl.DateTimeFormat('ca-ES',{dateStyle:'full',timeZone:'UTC'});
  const labels={sent:'Enviament',renewal:'Renovació prevista',reply:'Resposta',interview:'Entrevista'};
  const today=()=>dayFormat.format(new Date());
  const dateKey=date=>date.toISOString().slice(0,10);
  const utcDay=day=>new Date(day+'T00:00:00Z');
  let selected=today(), month=utcDay(selected.slice(0,7)+'-01');
  const interviewHistory='calendar_interviews';
  let editingInterview=null,undatedSends=0;
  const interviewOutcomes={
    pending:'Pendent de resposta',
    favorable:'Resposta favorable',
    unfavorable:'Resposta desfavorable'
  };
  function madridInstant(day,time){
    const wall=new Date(day+'T'+time+':00Z');
    const offset=value=>offsetFormat.formatToParts(value).find(part=>part.type==='timeZoneName').value.slice(3);
    const first=new Date(day+'T'+time+':00'+offset(wall));
    const instant=new Date(day+'T'+time+':00'+offset(first));
    if(dayFormat.format(instant)!==day||clockFormat.format(instant)!==time){
      throw Error('Aquesta hora no existeix a l’horari de Catalunya. Tria una altra hora.');
    }
    return instant;
  }

  function localEvents(){
    const histories={},statuses={};
    for(const key of Object.keys(localStorage)){
      if(key.startsWith('history_'))histories[key.slice(8)]=hist(key.slice(8));
      if(key.startsWith('status_'))statuses[key.slice(7)]=state(key.slice(7));
    }
    const projected=calendarApplicationSources(window.MAPA_DATA,histories,dashboardSentIndex(),privatePortalRows(localStorage),loadLegacyRows(),statuses);
    const events=projected.events;
    undatedSends=projected.undated;
    const interviews=hist(interviewHistory);
    const outcomes=new Map();
    for(const item of interviews){
      if(item.type!=='interview_outcome'||!Object.hasOwn(interviewOutcomes,item.outcome))continue;
      const key=JSON.stringify([item.interviewDate,item.text]);
      if(!outcomes.has(key))outcomes.set(key,item.outcome);
    }
    for(const item of calendarInterviewAppointments()){
      if(item.dateUnknown)continue;
      const start=new Date(item.date);
      events.push({type:'interview',date:dayFormat.format(start),time:item.timeUnknown?'':clockFormat.format(start),
        title:'Entrevista · '+item.text,location:item.location,duration:item.duration,
        interview:item,outcome:outcomes.get(JSON.stringify([item.date,item.text]))||item.outcome});
    }
    return events;
  }

  function render(focusDay=false){
    const summary=byId('calendarInterviewSummary');
    summary.replaceChildren();
    for(const item of calendarInterviewAppointments()){
      const row=document.createElement('li');
      const outcome=hist(interviewHistory).find(x=>x.type==='interview_outcome'&&x.interviewDate===item.date&&x.text===item.text)?.outcome||item.outcome||'pending';
      row.textContent=item.text+' · '+(item.dateUnknown?'Data de l’entrevista pendent de confirmar':dayFormat.format(new Date(item.date)))+' · '+interviewOutcomes[outcome]+(item.note?' · '+item.note:'')+(item.reminderMonth?' · Tornar a contactar: '+item.reminderMonth:'');
      const edit=document.createElement('button');edit.type='button';edit.className='smallBtn';edit.textContent='Editar entrevista';
      edit.setAttribute('aria-label','Editar entrevista · '+item.text);
      edit.addEventListener('click',()=>{
        editingInterview=item;form.hidden=false;
        form.elements.centre.value=item.text;
        form.elements.date.value=item.dateUnknown?'':dayFormat.format(new Date(item.date));
        form.elements.time.value=item.dateUnknown||item.timeUnknown?'':clockFormat.format(new Date(item.date));
        form.elements.location.value=item.location||'';form.elements.duration.value=item.duration||'';
        form.elements.outcome.value=outcome;form.elements.note.value=item.note||'';form.elements.reminderMonth.value=item.reminderMonth||'';
        form.elements.centre.focus();
      });
      row.append(' ',edit);summary.append(row);
    }
    const key=dateKey(month).slice(0,7);
    const followUps=byId('calendarMonthFollowUps');
    followUps.replaceChildren();
    for(const item of calendarMonthFollowUps(calendarInterviewAppointments(),key)){
      const row=document.createElement('li');
      row.textContent='Tornar a contactar · '+item.text+(item.note?' · '+item.note:'')+' · Dia pendent de concretar';
      followUps.append(row);
    }
    byId('calendarMonthFollowUpSection').hidden=!followUps.children.length;
    const events=new Map();
    const all=localEvents();
    const currentDay=today();
    for(const event of all){
      if(!event.date.startsWith(key))continue;
      const list=events.get(event.date)||new Map();
      list.set(event.id||event.type+'|'+norm(event.title).trim()+'|'+(event.type==='interview'?event.time||'':''),event);
      events.set(event.date,list);
    }
    const sentThisMonth=all.filter(event=>event.type==='sent'&&event.date.startsWith(key)).sort((a,b)=>b.sentAt.localeCompare(a.sentAt)||a.placeName.localeCompare(b.placeName,'ca'));
    byId('calendarSentCount').textContent=sentThisMonth.length+' enviaments registrats aquest mes · '+all.filter(event=>event.type==='sent').length+' en total'+(undatedSends?' · '+undatedSends+' centres marcats com a enviats sense data confirmada':'')+'.';
    const agenda=byId('calendarSentAgenda');agenda.replaceChildren();
    for(const event of sentThisMonth){
      const row=document.createElement('li');
      row.textContent=new Intl.DateTimeFormat('ca-ES',{timeZone:zone,dateStyle:'medium'}).format(new Date(event.sentAt))+' · '+event.placeName+(event.city?' · '+event.city:'');
      const thread=event.threadId||event.gmailId;
      if(thread&&/^[a-z0-9]+$/i.test(thread)){
        const link=document.createElement('a');link.href='https://mail.google.com/mail/u/0/#all/'+thread;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Veure a Gmail';row.append(' · ',link);
      }
      agenda.append(row);
    }
    if(!sentThisMonth.length){const row=document.createElement('li');row.textContent='No hi ha enviaments amb data registrada aquest mes.';agenda.append(row)}
    byId('calendarMonth').textContent=monthFormat.format(month);
    grid.replaceChildren();
    for(const day of ['Dl','Dt','Dc','Dj','Dv','Ds','Dg']){
      const label=document.createElement('span');
      label.className='calendar-weekday';
      label.textContent=day;
      grid.append(label);
    }
    for(let i=0;i<(month.getUTCDay()+6)%7;i++)grid.append(document.createElement('span'));
    const days=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    let focused;
    for(let i=1;i<=days;i++){
      const day=key+'-'+String(i).padStart(2,'0');
      const button=document.createElement('button');
      button.type='button';
      button.className='calendar-date';
      button.textContent=i;
      const types=[...new Set([...(events.get(day)?.values()||[])].map(event=>event.type))];
      button.setAttribute('aria-label',[fullDateFormat.format(utcDay(day)),...types.map(type=>labels[type])].join(', '));
      button.setAttribute('aria-pressed',String(day===selected));
      if(day===currentDay)button.setAttribute('aria-current','date');
      if(day===selected)focused=button;
      const dots=document.createElement('span');
      dots.className='calendar-dots';
      dots.setAttribute('aria-hidden','true');
      for(const type of types){
        const dot=document.createElement('span');
        dot.className='calendar-dot calendar-'+type;
        dots.append(dot);
      }
      button.append(dots);
      const sentCount=[...(events.get(day)?.values()||[])].filter(event=>event.type==='sent').length;
      if(sentCount){const count=document.createElement('small');count.className='calendar-send-count';count.textContent=sentCount;button.append(count);button.setAttribute('aria-label',button.getAttribute('aria-label')+', '+sentCount+' enviaments')} 
      button.addEventListener('click',()=>{
        selected=day;
        render(true);
        if(types.length)dayDialog.showModal();
      });
      grid.append(button);
    }
    byId('calendarDay').textContent=fullDateFormat.format(utcDay(selected));
    eventList.replaceChildren();
    const list=[...(events.get(selected)?.values()||[])].sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    for(const event of list){
      const row=document.createElement('li');
      row.className='calendar-'+event.type;
      row.textContent=(event.time?event.time+' · ':'')+event.title+(event.city?' · '+event.city:'')+
        (event.duration?' · '+event.duration+' min':'')+(event.location?' · '+event.location:'');
      const gmailLink=event.threadId||event.gmailId;
      if(gmailLink&&/^[a-z0-9]+$/i.test(gmailLink)){
        const link=document.createElement('a');
        link.href='https://mail.google.com/mail/u/0/#all/'+gmailLink;
        link.target='_blank';link.rel='noopener noreferrer';link.textContent='Veure el fil a Gmail';
        row.append(' · ',link);
      }
      if(event.interview&&Date.parse(event.interview.date)<=Date.now()){
        const buttons=document.createElement('div');
        buttons.className='calendar-controls interview-outcomes';
        buttons.setAttribute('role','group');
        buttons.setAttribute('aria-label','Resultat de l’entrevista · '+event.interview.text);
        for(const [outcome,label] of Object.entries(interviewOutcomes)){
          const button=document.createElement('button');
          button.type='button';
          button.className='smallBtn';
          button.dataset.outcome=outcome;
          button.setAttribute('aria-pressed',String(event.outcome===outcome));
          button.textContent=label;
          button.addEventListener('click',()=>{
            if(event.outcome===outcome)return;
            const rowIndex=[...eventList.children].indexOf(row);
            saveHistory(interviewHistory,{type:'interview_outcome',date:new Date().toISOString(),
              text:event.interview.text,interviewDate:event.interview.date,outcome});
            eventList.children[rowIndex]?.querySelector('[data-outcome="'+outcome+'"]')?.focus();
            status.textContent='Resultat desat: '+label;
          });
          buttons.append(button);
        }
        row.append(buttons);
      }
      eventList.append(row);
    }
    if(focusDay)focused?.focus();
  }

  function showMonth(day){
    selected=day;
    month=utcDay(day.slice(0,7)+'-01');
    render();
  }

  function saveHistory(id,entry){
    const entries=hist(id);
    if(entries.some(item=>item.date===entry.date&&item.type===entry.type&&item.text===entry.text))return;
    localStorage.setItem('history_'+id,JSON.stringify([entry,...entries].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))));
    document.dispatchEvent(new Event('candidature-history-changed'));
    document.dispatchEvent(new Event('private-data-changed'));
  }

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const fields=new FormData(form);
    const centre=fields.get('centre').trim(), day=fields.get('date'), time=fields.get('time');
    if(!centre){formStatus.textContent='Escriu el nom del centre o de l’empresa.';return;}
    try{
      if(time&&!day)throw Error('Indica el dia o deixa també l’hora en blanc.');
      const start=day?madridInstant(day,time||'12:00'):new Date();
      const dateUnknown=!day;
      if(calendarInterviewAppointments().some(x=>!(editingInterview&&x.date===editingInterview.date&&x.text===editingInterview.text)&&norm(x.text).trim()===norm(centre).trim()&&Boolean(x.dateUnknown)===dateUnknown&&(dateUnknown||x.date===start.toISOString())))throw Error('Aquesta entrevista ja consta al seguiment.');
      const entry={type:'interview',modifiedAt:new Date().toISOString(),interviewId:editingInterview?.interviewId||(editingInterview?JSON.stringify([editingInterview.date,editingInterview.type,editingInterview.text]):crypto.randomUUID()),date:start.toISOString(),dateUnknown,timeUnknown:!time,text:centre,
        outcome:fields.get('outcome'),note:fields.get('note').trim(),reminderMonth:fields.get('reminderMonth'),
        location:fields.get('location').trim(),duration:Number(fields.get('duration'))};
      if(editingInterview){
        const rows=hist(interviewHistory).filter(x=>!(x.type==='interview'&&x.date===editingInterview.date&&x.text===editingInterview.text));
        localStorage.setItem('history_'+interviewHistory,JSON.stringify([entry,...rows]));
        saveHistory(interviewHistory,{type:'interview_outcome',date:new Date().toISOString(),text:entry.text,interviewDate:entry.date,outcome:entry.outcome});
        editingInterview=null;
      }else saveHistory(interviewHistory,entry);
      form.reset();
      form.hidden=true;
      showMonth(day||today());
      status.textContent='Entrevista desada al calendari de l’app.';
      byId('calendarInterview').focus();
    }catch(error){formStatus.textContent=error.message;}
  });

  const sentForm=byId('calendarSentForm');
  byId('calendarRegisterSent').addEventListener('click',()=>{
    sentForm.hidden=false;
    sentForm.elements.date.value=selected<=today()?selected:today();
    sentForm.elements.date.max=today();
    sentForm.elements.centre.focus();
  });
  byId('calendarCancelSent').addEventListener('click',()=>{
    sentForm.hidden=true;
    byId('calendarRegisterSent').focus();
  });
  sentForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!sentForm.reportValidity())return;
    const fields=new FormData(sentForm);
    const centre=fields.get('centre').trim(), day=fields.get('date');
    if(!centre||!day||day>today()){byId('calendarSentStatus').textContent='Indica el centre i un dia d’enviament vàlid.';return;}
    try{
      const data=window.MAPA_DATA;
      const matches=[...data.centres,...(data.archived||[]),...data.entitats.infantil,...data.entitats.lleure]
        .filter(place=>norm(place.name)===norm(centre));
      const custom=Object.keys(localStorage).find(key=>key.startsWith('history_calendar_place_')&&
        hist(key.slice(8)).some(item=>item.placeName&&norm(item.placeName)===norm(centre)));
      const id=matches.length===1?String(matches[0].id):custom?.slice(8)||'calendar_place_'+crypto.randomUUID();
      const date=madridInstant(day,'00:00').toISOString();
      const last=hist(id).find(item=>item.type==='sent');
      if(!last||Date.parse(date)>Date.parse(last.date)){
        if(!['replied','interview'].includes(state(id)))localStorage.setItem('status_'+id,'sent');
      }
      saveHistory(id,{type:'sent',source:'manual',date,text:'Candidatura enviada · registre manual',placeName:centre});
      sentForm.reset();
      sentForm.hidden=true;
      showMonth(day);
      status.textContent='Enviament desat al calendari.';
      byId('calendarRegisterSent').focus();
    }catch(error){byId('calendarSentStatus').textContent=error.message;}
  });

  byId('calendarInterview').addEventListener('click',()=>{
    editingInterview=null;form.reset();
    form.hidden=false;
    form.elements.date.value='';
    form.elements.centre.focus();
  });
  byId('calendarCancel').addEventListener('click',()=>{form.hidden=true;byId('calendarInterview').focus()});
  byId('calendarPrevious').addEventListener('click',()=>showMonth(dateKey(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1)))));
  byId('calendarNext').addEventListener('click',()=>showMonth(dateKey(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1)))));
  byId('calendarToday').addEventListener('click',()=>showMonth(today()));
  dayDialog.addEventListener('close',()=>grid.querySelector('[aria-pressed="true"]')?.focus());
  document.addEventListener('private-data-restored',()=>{if(!page.hidden)render()});
  document.addEventListener('candidature-history-changed',()=>{if(!page.hidden)render()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!page.hidden)render()});
  window.addEventListener('storage',event=>{if(!page.hidden&&/^(history_|status_)/.test(event.key||''))render()});
  setInterval(()=>{if(!document.hidden&&!page.hidden)render()},60000);
  window.renderApplicationCalendar=render;
})();
