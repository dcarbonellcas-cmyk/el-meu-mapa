(() => {
  const byId=id=>document.getElementById(id);
  const page=byId('calendarPage'), grid=byId('calendarGrid'), eventList=byId('calendarEvents');
  const connect=byId('calendarConnect'), status=byId('calendarStatus');
  const form=byId('calendarInterviewForm'), formStatus=byId('calendarFormStatus');
  const zone='Europe/Madrid';
  const scope='https://www.googleapis.com/auth/gmail.readonly';
  const prefix='history_calendar_';
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
  let token='', expires=0, busy=false, lastRefresh=0, editing=null;

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
          const sentDate=dayFormat.format(sentAt);
          const due=nextRenewalDate(sentDate+'T12:00:00');
          const date=dayFormat.format(due);
          const recipient=String(place.email||'').trim().toLowerCase();
          events.push({type:'renewal',date,title:'Reenviar CV · '+place.name,sentDate,recipient});
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

  function savedRecords(){
    const records=new Map();
    for(const [key,value] of Object.entries(trackingValues())){
      if(!key.startsWith(prefix))continue;
      try{
        const entries=JSON.parse(value);
        if(entries[0]?.type==='calendarEntry')records.set(key,JSON.parse(entries[0].text));
      }catch{}
    }
    return records;
  }

  function writeRecord(key,events){
    const date=new Date().toISOString();
    const type=events===null?'calendarRemoved':'calendarEntry';
    localStorage.setItem(key,JSON.stringify([{date,type,text:JSON.stringify(events)}]));
  }

  function savedEvents(){
    const events=[];
    for(const [key,record] of savedRecords()){
      if(!Array.isArray(record))continue;
      for(const event of record){
        if(!event||!labels[event.type]||typeof event.title!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(event.date))continue;
        events.push({...event,manualKey:key.startsWith(prefix+'manual_')?key:''});
      }
    }
    return events;
  }

  function openInterview(event){
    editing=event?.manualKey||null;
    form.reset();
    form.hidden=false;
    form.elements.date.value=event?.date||selected;
    form.elements.centre.value=event?.centre||'';
    form.elements.time.value=event?.time||'';
    form.elements.duration.value=event?.duration||30;
    form.elements.location.value=event?.location||'';
    byId('calendarFormTitle').textContent=editing?'Editar una entrevista':'Afegir una entrevista';
    formStatus.textContent='';
    form.elements.centre.focus();
  }

  function removeInterview(key){
    if(!confirm('Vols suprimir aquesta entrevista del calendari?'))return;
    try{
      writeRecord(key,null);
      document.dispatchEvent(new Event('private-data-changed'));
      if(editing===key)form.hidden=true;
      render();
    }catch{status.textContent='No s’ha pogut suprimir l’entrevista.'}
  }

  function showAlerts(events){
    const alert=byId('calendarAlerts');
    const current=today();
    const due=events.filter(event=>event.date===current&&(event.type==='renewal'||event.type==='interview'));
    const renewals=due.filter(event=>event.type==='renewal').length;
    const interviews=due.filter(event=>event.type==='interview').length;
    const reminders=[];
    if(renewals)reminders.push(renewals===1?'Avui toca renovar una candidatura.':'Avui toca renovar '+renewals+' candidatures.');
    if(interviews)reminders.push(interviews===1?'Avui tens una entrevista.':'Avui tens '+interviews+' entrevistes.');
    alert.hidden=!reminders.length;
    alert.textContent=reminders.join(' ');
  }

  function render(focusDay=false){
    const key=dateKey(month).slice(0,7);
    const events=new Map();
    const unique=new Map(), renewals=new Map();
    for(const event of [...localEvents(),...savedEvents()]){
      if(event.type==='renewal'&&event.recipient){
        const previous=renewals.get(event.recipient);
        if(!previous||previous.sentDate<=event.sentDate)renewals.set(event.recipient,event);
        continue;
      }
      const identity=[event.type,event.date,norm(event.title).trim(),event.type==='interview'?event.time||'':''].join('|');
      const previous=unique.get(identity);
      if(!previous?.manualKey||event.manualKey)unique.set(identity,event);
    }
    const visible=[...unique.values(),...renewals.values()];
    showAlerts(visible);
    for(const event of visible){
      if(!event.date.startsWith(key))continue;
      const list=events.get(event.date)||[];
      list.push(event);
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
      if(event.location)row.append(' · '+event.location);
      if(event.duration)row.append(' · '+event.duration+' min');
      if(/^[a-f0-9]+$/i.test(event.threadId||'')){
        const link=document.createElement('a');
        link.textContent='Veure el correu';
        link.href='https://mail.google.com/mail/#all/'+event.threadId;
        link.target='_blank';
        link.rel='noopener noreferrer';
        row.append(' · ',link);
      }
      if(event.manualKey){
        for(const [label,action] of [['Editar',()=>openInterview(event)],['Suprimir',()=>removeInterview(event.manualKey)]]){
          const button=document.createElement('button');
          button.type='button';
          button.className='smallBtn';
          button.textContent=label;
          button.addEventListener('click',action);
          row.append(' ',button);
        }
      }
      eventList.append(row);
    }
    if(!list.length){
      const row=document.createElement('li');
      row.textContent='Cap esdeveniment aquest dia.';
      eventList.append(row);
    }
    if(focusDay)focused?.focus();
  }

  async function refresh(force=false){
    if(!token||page.hidden||busy)return;
    if(Date.now()>=expires){
      token='';
      connect.textContent='Connectar Gmail';
      status.textContent='La sessió de Gmail ha caducat. Els esdeveniments desats continuen visibles.';
      return;
    }
    if(!force&&Date.now()-lastRefresh<5*60000)return;
    busy=true;
    connect.disabled=true;
    status.textContent='Llegint les candidatures de Gmail…';
    try{
      const records=await readApplicationCalendarMail(token);
      const existing=savedRecords();
      let changed=false;
      for(const [id,events] of records){
        const key=prefix+'gmail_'+id;
        if(!events.length&&!existing.has(key))continue;
        if(JSON.stringify(existing.get(key))===JSON.stringify(events))continue;
        writeRecord(key,events.length?events:null);
        changed=true;
      }
      if(changed)document.dispatchEvent(new Event('private-data-changed'));
      lastRefresh=Date.now();
      status.textContent='Gmail actualitzat. Les novetats es revisen mentre tens el calendari obert.';
      render();
    }catch(error){
      token='';
      connect.textContent='Connectar Gmail';
      status.textContent=error.message+' Els esdeveniments desats es conserven.';
    }finally{
      busy=false;
      connect.disabled=false;
    }
  }

  function showMonth(day){
    selected=day;
    month=utcDay(day.slice(0,7)+'-01');
    render();
    refresh();
  }

  connect.addEventListener('click',()=>{
    if(token&&Date.now()<expires){refresh(true);return}
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
          if(!result.access_token){finish('No s’ha pogut autoritzar Gmail.');return}
          if(!finish())return;
          token=result.access_token;
          expires=Date.now()+Number(result.expires_in||3600)*1000-30000;
          connect.textContent='Actualitzar Gmail';
          refresh(true);
        },
        error_callback:()=>finish('No s’ha pogut obrir la finestra de Google. Torna-ho a provar a Safari o Chrome.')
      }).requestAccessToken({prompt:'select_account'});
    }catch{finish('No s’ha pogut iniciar la connexió amb Gmail.')}
  });

  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const fields=new FormData(form);
    const centre=fields.get('centre').trim(), date=fields.get('date'), time=fields.get('time');
    if(!centre){formStatus.textContent='Escriu el nom del centre o de l’empresa.';return}
    try{
      madridInstant(date,time);
      const location=fields.get('location').trim();
      const duration=Number(fields.get('duration'));
      const key=editing||prefix+'manual_'+crypto.randomUUID().replaceAll('-','');
      writeRecord(key,[{type:'interview',title:'Entrevista · '+centre,centre,date,time,location,duration}]);
      document.dispatchEvent(new Event('private-data-changed'));
      editing=null;
      form.reset();
      form.hidden=true;
      showMonth(date);
    }catch(error){
      formStatus.textContent=error.message;
    }
  });

  byId('calendarInterview').addEventListener('click',()=>openInterview());
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