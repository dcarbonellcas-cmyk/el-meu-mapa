// Read only application threads from the Gmail account connected to this view.
async function readApplicationCalendarMail(accessToken){
  const api='https://gmail.googleapis.com/gmail/v1/users/me/';
  async function read(path){
    const response=await fetch(api+path,{headers:{Authorization:'Bearer '+accessToken}});
    if(response.status===401)throw Error('La sessió de Gmail ha caducat. Torna a connectar-la.');
    if(response.status===403)throw Error('Gmail no ha concedit permís de lectura. Torna a connectar el compte.');
    if(!response.ok)throw Error('No s’han pogut llegir les candidatures de Gmail ('+response.status+').');
    return response.json();
  }

  const ids=new Set();
  const query=new URLSearchParams({
    q:'newer_than:90d {subject:candidatura subject:autocandidatura subject:curriculum subject:currículum subject:entrevista subject:interview} -in:spam -in:trash',
    maxResults:'100',fields:'threads(id),nextPageToken'
  });
  do{
    const result=await read('threads?'+query);
    for(const thread of result.threads||[]){
      if(/^[a-f0-9]+$/i.test(thread.id))ids.add(thread.id);
    }
    if(result.nextPageToken)query.set('pageToken',result.nextPageToken);
    else query.delete('pageToken');
  }while(query.has('pageToken'));

  const records=new Map();
  const threadIds=[...ids];
  for(let i=0;i<threadIds.length;i+=5){
    const batch=threadIds.slice(i,i+5);
    await Promise.all(batch.map(async id=>{
      const thread=await read('threads/'+id+'?format=full');
      const record=applicationCalendarThread(id,thread.messages||[]);
      records.set(id,record);
    }));
  }
  return records;
}

function applicationCalendarThread(threadId,messages){
  const madridDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
  const header=(message,name)=>message.payload?.headers?.find(h=>h.name.toLowerCase()===name)?.value||'';
  const label=(message,name)=>message.labelIds?.includes(name);
  const mailbox=value=>value.match(/[\w.!#$%&'*+/=?^_+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase()||'';
  const ordered=messages.filter(message=>Number.isFinite(Number(message.internalDate)))
    .sort((a,b)=>Number(a.internalDate)-Number(b.internalDate));
  const sent=ordered.filter(message=>label(message,'SENT')&&/candidatur|curr[ií]culum/i.test(header(message,'subject')));
  const last=sent.at(-1);
  const recipient=last?mailbox(header(last,'to')):'';
  const subject=last?header(last,'subject'):'';
  const parts=subject.split(/\s+[–—-]\s+/);
  const centre=parts.length>=4?parts.at(-2).trim():recipient;
  const events=[];
  if(last&&recipient){
    const bounced=ordered.some(message=>Number(message.internalDate)>=Number(last.internalDate)&&
      /mailer-daemon|postmaster/i.test(header(message,'from'))&&
      String(message.snippet||'').toLowerCase().includes(recipient));
    if(!bounced){
      const sentDate=madridDate.format(new Date(Number(last.internalDate)));
      const due=nextRenewalDate(sentDate+'T12:00:00');
      events.push({type:'renewal',date:madridDate.format(due),title:'Reenviar CV · '+centre,recipient,sentDate,threadId});
    }
  }
  for(const message of ordered){
    if(label(message,'SENT')||label(message,'DRAFT')||label(message,'SPAM')||label(message,'TRASH'))continue;
    const sender=mailbox(header(message,'from'));
    const incomingSubject=header(message,'subject');
    if(!sender||/mailer-daemon|postmaster|no-?reply|noreply/i.test(sender))continue;
    if(/^(auto-generated|auto-replied)/i.test(header(message,'auto-submitted'))||/^(bulk|list|junk)$/i.test(header(message,'precedence')))continue;
    const received=new Date(Number(message.internalDate));
    const belongs=sent.some(out=>Number(out.internalDate)<=Number(message.internalDate));
    const from=centre||header(message,'from').split('<')[0].trim().replace(/^"|"$/g,'')||sender;
    const interview=confirmedApplicationInterview(incomingSubject,applicationMailText(message),madridDate.format(received));
    if(interview)events.push({type:'interview',...interview,title:'Entrevista · '+from,threadId});
    else if(belongs){
      events.push({type:'reply',date:madridDate.format(received),title:'Resposta de candidatura · '+from,threadId});
    }
  }
  return events;
}

function applicationMailText(message){
  const parts=[];
  function collect(part){
    if(!part)return;
    if(part.body?.data)parts.push(part);
    for(const child of part.parts||[])collect(child);
  }
  collect(message.payload);
  const part=parts.find(x=>x.mimeType==='text/plain');
  if(!part)return message.snippet||'';
  try{
    const decoded=atob(part.body.data.replace(/-/g,'+').replace(/_/g,'/'));
    return new TextDecoder().decode(Uint8Array.from(decoded,c=>c.charCodeAt(0)));
  }catch{return message.snippet||''}
}

function confirmedApplicationInterview(subject,body,receivedDay){
  const visible=body.split(/\n\s*(?:>|El .+ va escriure:|El .+ escribió:|On .+ wrote:)/i)[0].slice(0,3500);
  const message=(subject+' '+visible).replace(/\s+/g,' ');
  if(!/\bentrevista\b|\binterview\b/i.test(message))return null;
  if(!/\bconfirm(?:em|o|amos|ada|ado|ed|ació|ación)\b|\b(?:et|us|te|le)\s+convoqu(?:em|em per)|\bconvocamos\b/i.test(message))return null;
  if(/\b(?:cancel|propos|reprogram|pendent|pending|disponibilitat|disponibilidad|disponible|opcions|opciones|no podem|no podemos)/i.test(message))return null;
  const dates=new Set();
  const times=new Set();
  function addDate(year,month,day){
    const date=year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
    const parsed=new Date(date+'T00:00:00Z');
    if(Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date)dates.add(date);
  }
  for(const match of message.matchAll(/\b(?:(20\d\d)-(\d{2})-(\d{2})|(\d{1,2})[/.](\d{1,2})[/.](20\d\d))\b/g)){
    const [_,isoYear,isoMonth,isoDay,shortDay,shortMonth,shortYear]=match;
    addDate(isoYear||shortYear,isoMonth||shortMonth,isoDay||shortDay);
  }
  const months={
    gener:1,enero:1,febrer:2,febrero:2,marc:3,marzo:3,abril:4,maig:5,mayo:5,
    juny:6,junio:6,juliol:7,julio:7,agost:8,agosto:8,setembre:9,septiembre:9,
    octubre:10,novembre:11,noviembre:11,desembre:12,diciembre:12
  };
  const plain=message.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  for(const match of plain.matchAll(/\b(\d{1,2})\s+d(?:e\s+|['’])([a-z]+)(?:\s+(?:de|del)\s+(20\d\d))?\b/g)){
    const [_,day,name,year]=match;
    const month=months[name];
    if(!month)continue;
    addDate(year||receivedDay.slice(0,4),month,day);
  }
  for(const match of message.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\s*h?\b/gi)){
    times.add(match[1].padStart(2,'0')+':'+match[2]);
  }
  if(dates.size!==1||times.size!==1)return null;
  const date=[...dates][0],time=[...times][0];
  if(date<receivedDay)return null;
  return {date,time};
}
