(() => {
  const byId=id=>document.getElementById(id);
  const page=byId('calendarPage'), grid=byId('calendarGrid'), eventList=byId('calendarEvents');
  const connect=byId('calendarConnect'), status=byId('calendarStatus');
  const form=byId('calendarInterviewForm'), formStatus=byId('calendarFormStatus');
  const zone='Europe/Madrid';
  const scope='https://www.googleapis.com/auth/calendar.events.owned';
  const endpoint='https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const manualNote='Entrevista afegida manualment des d’El meu mapa.';
  const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
  const clockFormat=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const offsetFormat=new Intl.DateTimeFormat('en-GB',{timeZone:zone,timeZoneName:'longOffset'});
  const monthFormat=new Intl.DateTimeFormat('ca-ES',{month:'long',year:'numeric',timeZone:'UTC'});
  const fullDateFormat=new Intl.DateTimeFormat('ca-ES',{dateStyle:'full',timeZone:'UTC'});
  const labels={renewal:'Reenviar el CV',reply:'Resposta',interview:'Entrevista'};
  const today=()=>dayFormat.format(new Date());
  const dateKey=date=>date.toISOString().slice(0,10);
  const utcDay=day=>new Date(day+'T00:00:00Z');
  let selected=today(), month=utcDay(selected.slice(0,7)+'-01');
  let token='', expires=0, request=0, remoteEvents=[], pendingInterview=null;

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
    const data=window.MAPA_DATA;
    const places=[...data.centres,...(data.archived||[]),...data.entitats.infantil,...data.entitats.lleure];
    const events=[];
    for(const place of places){
      const history=hist(place.id);
      if(!Array.isArray(history))continue;
      const sent=history.find(item=>item?.type==='sent'&&Number.isFinite(Date.parse(item.date)));
      if(sent&&state(place.id)==='sent'){
        const sentAt=new Date(sent.date);
        if(Number.isFinite(sentAt.getTime())){
          // Use a local noon for the existing calendar-month renewal rule.
          const due=nextRenewalDate(dayFormat.format(sentAt)+'T12:00:00');
          const date=dayFormat.format(due);
          events.push({type:'renewal',date,title:'Reenviar CV · '+place.name});
        }
      }
      for(const item of history){
        if(item?.type!=='replied')continue;
        const date=new Date(item.date);
        if(Number.isFinite(date.getTime())){
          events.push({type:'reply',date:dayFormat.format(date),title:'Resposta de candidatura · '+place.name});
        }
      }
    }
    return events;
  }

  function fromGoogle(event){
    const title=event.summary||'';
    const description=event.description||'';
    let type;
    if(title.startsWith('Reenviar CV · ')&&description.includes('El meu mapa · renovació ·'))type='renewal';
    if(title.startsWith('Resposta de candidatura · ')&&description.includes('El meu mapa · resposta · Gmail:'))type='reply';
    if(/^Entrevista(?:\s*·|\s*$)/i.test(title))type='interview';
    if(!type)return null;
    const start=event.start||{};
    const instant=new Date(start.dateTime||'');
    const timed=Number.isFinite(instant.getTime());
    const date=start.date||(timed?dayFormat.format(instant):'');
    if(!date)return null;
    return {type,title,date,time:timed?clockFormat.format(instant):''};
  }

  function render(focusDay=false){
    const key=dateKey(month).slice(0,7);
    const events=new Map();
    for(const event of [...localEvents(),...remoteEvents]){
      if(!event.date.startsWith(key))continue;
      const list=events.get(event.date)||new Map();
      list.set(event.type+'|'+norm(event.title).trim()+'|'+(event.type==='interview'?event.time||'':''),event);
      events.set(event.date,list);
    }
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
    const currentDay=today();
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
      button.addEventListener('click',()=>{selected=day;render(true)});
      grid.append(button);
    }
    byId('calendarDay').textContent=fullDateFormat.format(utcDay(selected));
    eventList.replaceChildren();
    const list=[...(events.get(selected)?.values()||[])].sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    for(const event of list){
      const row=document.createElement('li');
      row.className='calendar-'+event.type;
      row.textContent=(event.time?event.time+' · ':'')+event.title;
      eventList.append(row);
    }
    if(!list.length){
      const row=document.createElement('li');
      row.textContent='Cap esdeveniment aquest dia.';
      eventList.append(row);
    }
    if(focusDay)focused?.focus();
  }

  function setDisconnected(message){
    request++;
    token='';
    expires=0;
    remoteEvents=[];
    connect.textContent='Connectar Google Calendar';
    status.textContent=message;
    if(!page.hidden)render();
  }

  async function api(url,options={}){
    const response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}});
    if(response.status===401){
      setDisconnected('La connexió ha caducat. Torna a connectar Google Calendar.');
      throw Error(status.textContent);
    }
    if(response.status===403){
      throw Error('Google no permet l’accés al calendari. Comprova que hagis concedit el permís i que l’API de Calendar estigui habilitada.');
    }
    return response;
  }

  async function refresh(){
    if(!token||page.hidden)return;
    if(Date.now()>=expires){
      setDisconnected('Torna a connectar Google Calendar per actualitzar les cites.');
      return;
    }
    const sequence=++request;
    const nextMonth=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1));
    const query=new URLSearchParams({
      timeMin:madridInstant(dateKey(month),'00:00').toISOString(),
      timeMax:madridInstant(dateKey(nextMonth),'00:00').toISOString(),
      singleEvents:'true',maxResults:'250',
      fields:'items(summary,description,start),nextPageToken'
    });
    try{
      const events=[];
      do{
        const response=await api(endpoint+'?'+query);
        if(!response.ok)throw Error('No s’ha pogut actualitzar Google Calendar ('+response.status+').');
        const result=await response.json();
        if(sequence!==request)return;
        events.push(...(result.items||[]).map(fromGoogle).filter(Boolean));
        if(result.nextPageToken)query.set('pageToken',result.nextPageToken);
        else query.delete('pageToken');
      }while(query.has('pageToken'));
      remoteEvents=events;
      status.textContent='Google Calendar connectat. Les cites es revisen mentre tens aquesta vista oberta.';
      render();
    }catch(error){
      if(sequence===request)status.textContent=error.message;
    }
  }

  function showMonth(day){
    selected=day;
    month=utcDay(day.slice(0,7)+'-01');
    render();
    refresh();
  }

  connect.addEventListener('click',()=>{
    if(token&&Date.now()<expires){refresh();return}
    if(!window.google?.accounts?.oauth2){
      status.textContent='Google encara no s’ha carregat. Torna-ho a provar en uns segons.';
      return;
    }
    connect.disabled=true;
    status.textContent='Tria el compte de Google que fas servir per a les candidatures.';
    let pending=true;
    const timeout=setTimeout(()=>finish('Google no ha completat la connexió. Comprova si el navegador ha bloquejat la finestra.'),60000);
    function finish(message){
      if(!pending)return false;
      pending=false;
      clearTimeout(timeout);
      connect.disabled=false;
      if(message)status.textContent=message;
      return true;
    }
    try{
      google.accounts.oauth2.initTokenClient({
        client_id:GMAIL_CLIENT_ID,scope,include_granted_scopes:false,
        callback:result=>{
          if(!result.access_token){finish('No s’ha pogut autoritzar Google Calendar.');return}
          if(!finish())return;
          token=result.access_token;
          expires=Date.now()+Number(result.expires_in||3600)*1000-30000;
          connect.textContent='Actualitzar Google Calendar';
          refresh();
        },
        error_callback:()=>finish('No s’ha pogut obrir la finestra de Google. Torna-ho a provar a Safari o Chrome.')
      }).requestAccessToken({prompt:'select_account'});
    }catch{finish('No s’ha pogut iniciar la connexió amb Google Calendar.')}
  });

  function offerCalendarDraft(title,location,start,end,message=''){
    const compact=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const query=new URLSearchParams({action:'TEMPLATE',text:title,details:manualNote,location,dates:compact(start)+'/'+compact(end),ctz:zone});
    const link=document.createElement('a');
    link.href='https://calendar.google.com/calendar/render?'+query;
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.textContent='Obrir l’esborrany i desar-lo a Google Calendar';
    formStatus.replaceChildren(message?message+' ':'',link);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const submit=form.querySelector('[type="submit"]');
    if(submit.disabled)return;
    const fields=new FormData(form);
    const centre=fields.get('centre').trim(), day=fields.get('date'), time=fields.get('time');
    if(!centre){formStatus.textContent='Escriu el nom del centre o de l’empresa.';return}
    let start;
    try{start=madridInstant(day,time)}
    catch(error){formStatus.textContent=error.message;return}
    const end=new Date(start.getTime()+Number(fields.get('duration'))*60000);
    const title='Entrevista · '+centre;
    const location=fields.get('location').trim();
    const details={summary:title,description:manualNote,location,start:{dateTime:start.toISOString(),timeZone:zone},end:{dateTime:end.toISOString(),timeZone:zone},colorId:'3',visibility:'private',reminders:{useDefault:false,overrides:[{method:'popup',minutes:1440},{method:'popup',minutes:30}]}};
    if(!token||Date.now()>=expires){
      offerCalendarDraft(title,location,start,end);
      return;
    }
    const fingerprint=JSON.stringify(details);
    if(pendingInterview?.fingerprint!==fingerprint)pendingInterview={fingerprint,id:crypto.randomUUID().replaceAll('-','')};
    submit.disabled=true;
    formStatus.textContent='Desant l’entrevista…';
    try{
      const response=await api(endpoint+'?sendUpdates=none',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...details,id:pendingInterview.id})
      });
      if(!response.ok&&response.status!==409)throw Error('No s’ha pogut desar l’entrevista ('+response.status+').');
      pendingInterview=null;
      form.reset();
      form.hidden=true;
      formStatus.textContent='';
      showMonth(day);
    }catch(error){
      if(!token||error.message.startsWith('Google no permet'))offerCalendarDraft(title,location,start,end,error.message);
      else formStatus.textContent=error.message;
    }finally{submit.disabled=false}
  });

  byId('calendarInterview').addEventListener('click',()=>{
    form.hidden=false;
    form.elements.date.value=selected;
    form.elements.centre.focus();
  });
  byId('calendarCancel').addEventListener('click',()=>{form.hidden=true;byId('calendarInterview').focus()});
  byId('calendarPrevious').addEventListener('click',()=>showMonth(dateKey(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1)))));
  byId('calendarNext').addEventListener('click',()=>showMonth(dateKey(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1)))));
  byId('calendarToday').addEventListener('click',()=>showMonth(today()));
  document.addEventListener('private-data-restored',()=>{if(!page.hidden)render()});
  document.addEventListener('candidature-history-changed',()=>{if(!page.hidden)render()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  setInterval(refresh,60000);
  window.renderApplicationCalendar=()=>{render();refresh()};
})();