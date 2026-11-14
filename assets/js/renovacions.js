// One calendar month, clamped to the final day of the following month.
function nextRenewalDate(value){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return null;
  const day=date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth()+1);
  const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  date.setDate(Math.min(day,last));
  return date;
}

// Derived views only: never change a confirmed send date or send a message.
function candidatureTracking(history,status='none',{now=new Date(),interviews=[]}={}){
  const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const rows=(Array.isArray(history)?history:[]).filter(x=>Number.isFinite(Date.parse(x?.date))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const last=rows.filter(x=>x.type==='sent').at(-1);
  const today=day(now),month=today.slice(0,7);
  let afterFollowUp=false;
  if(interviews.length){
    const reminders=interviews.map(x=>x.reminderMonth).filter(x=>/^\d{4}-(0[1-9]|1[0-2])$/.test(x||'')).sort();
    if(reminders.length&&month>=reminders[0]&&(!last||day(last.date).slice(0,7)<reminders[0]))return {bucket:'renew',hasSent:!!last||status==='sent',dueDay:null,reason:'Seguiment previst: '+reminders[0]};
    afterFollowUp=Boolean(last&&(reminders.length?day(last.date).slice(0,7)>=reminders[0]:interviews.every(x=>!x.dateUnknown&&Number.isFinite(Date.parse(x.date))&&Date.parse(last.date)>Date.parse(x.date))));
    if(!afterFollowUp)return {bucket:'sent',hasSent:!!last||status==='sent',dueDay:null,reason:'Entrevista o resposta registrada; consulta el seguiment'};
  }
  if(!last)return {bucket:status==='sent'||['replied','interview','rejected'].includes(status)?'sent':'unsent',hasSent:status==='sent',dueDay:null,reason:status==='sent'?'Enviament registrat sense data confirmada':''};
  const outcomes=rows.filter(x=>['replied','interview','rejected','delivery_failed'].includes(x.type)||(x.type==='status'&&/Estat canviat a (Han contestat|Entrevista)/.test(x.text||'')));
  const resolved=outcomes.some(x=>Date.parse(x.date)>=Date.parse(last.date)&&(!x.applicationSentAt||Math.abs(Date.parse(x.applicationSentAt)-Date.parse(last.date))<60000));
  if(resolved||(!afterFollowUp&&!outcomes.length&&['replied','interview','rejected'].includes(status)))return {bucket:'sent',hasSent:true,lastSent:last.date,dueDay:null,reason:'Hi ha una resposta o incidència posterior; revisa-la abans de tornar a enviar'};
  const [year,monthNumber,number]=day(last.date).split('-').map(Number);
  const lastDay=new Date(Date.UTC(year,monthNumber+1,0)).getUTCDate();
  const dueDay=new Date(Date.UTC(year,monthNumber,Math.min(number,lastDay))).toISOString().slice(0,10);
  return {bucket:today>=dueDay?'renew':'sent',hasSent:true,lastSent:last.date,dueDay,reason:(today>=dueDay?'Per tornar a enviar des de ':'Pròxima revisió: ')+dueDay};
}
function interviewsForPlace(place,records){
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  return records.filter(item=>item.type==='interview'&&(item.placeId?String(item.placeId)===String(place.id):normalize(item.text)===normalize(place.name)));
}
function trackingForPlace(place,now=new Date()){
  const id=String(place.id),aliases={xarxa_fecc:['xarxa_fep'],xarxa_fep:['xarxa_fecc'],xarxa_borsadocent:['xarxa_manyanet'],xarxa_manyanet:['xarxa_borsadocent']};
  const ids=[id,...(aliases[id]||[])],history=ids.flatMap(key=>hist(key));
  if(typeof dashboardSentIndex==='function')for(const entry of dashboardSentIndex())if(ids.includes(String(entry.placeId)))history.push({...entry,type:'sent'});
  const interviews=interviewsForPlace(place,hist('calendar_interviews'));
  const current=ids.map(key=>state(key)).find(value=>value!=='none')||'none';
  return candidatureTracking(history,current,{now,interviews});
}

// Delivery and renewal are separate: an overdue CV has still been sent.
function candidatureDeliveryMatches(tracking,filter){
  return filter==='all'||(filter==='sent'?tracking.hasSent:!tracking.hasSent);
}
