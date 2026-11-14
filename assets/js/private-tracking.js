// Only these application records may reach the private Drive app-data folder.
const privateTrackingKey=key=>/^(jobPortal_|history_|status_|note_)[A-Za-z0-9_-]{1,160}$/.test(key);
const trackingEpoch='1970-01-01T00:00:00.001Z';
let trackingObserved=new Map();
function trackingValues(){
  const rows={};
  for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(privateTrackingKey(key))rows[key]=localStorage.getItem(key)}
  return rows;
}
function trackingTimes(){try{return JSON.parse(localStorage.getItem('mapaTrackingTimes_v1')||'{}')}catch{return {}}}
function privateTrackingSnapshot(){
  const values=trackingValues(),times=trackingTimes(),entries={};
  for(const [key,value] of Object.entries(values)){
    if(value.length>1000000)throw Error('Un registre de seguiment és massa gran. La còpia local es conserva.');
    entries[key]={value,updated:times[key]||trackingEpoch};
  }
  if(!Object.keys(entries).length)return null;
  return {version:1,key:'tracking',updated:Object.values(entries).map(x=>x.updated).sort().at(-1),entries};
}
function validatePrivateTracking(record){
  if(!record.entries||Array.isArray(record.entries)||typeof record.entries!=='object'||Object.keys(record.entries).length>30000)throw Error('Seguiment privat no vàlid.');
  for(const [key,row] of Object.entries(record.entries)){
    if(!privateTrackingKey(key)||!row||typeof row.value!=='string'||row.value.length>1000000||!Number.isFinite(Date.parse(row.updated)))throw Error('Registre privat no vàlid.');
    if(key.startsWith('history_')){
      const history=JSON.parse(row.value);
      if(!Array.isArray(history)||history.some(x=>!x||typeof x.date!=='string'||!Number.isFinite(Date.parse(x.date))||typeof x.type!=='string'||typeof x.text!=='string'))throw Error('Historial privat no vàlid.');
    }
    if(key.startsWith('jobPortal_')){
      const portal=JSON.parse(row.value);
      if(!portal||!['pending','prepared','registered'].includes(portal.status))throw Error('Borsa privada no vàlida.');
    }
  }
}
function mergePrivateTracking(local,remote){
  if(!local&&!remote)return null;
  for(const record of [local,remote])if(record)validatePrivateTracking(record);
  const entries={};
  for(const key of [...new Set([...Object.keys(local?.entries||{}),...Object.keys(remote?.entries||{})])].sort()){
    const a=local?.entries[key],b=remote?.entries[key];
    if(!a||!b){entries[key]=a||b;continue}
    const latest=Date.parse(a.updated)>Date.parse(b.updated)?a:Date.parse(a.updated)<Date.parse(b.updated)?b:a.value>=b.value?a:b;
    if(key.startsWith('history_')){
      // Prefer the edited version of the same event; retain distinct events from both devices.
      const rows=latest===a?[...JSON.parse(b.value),...JSON.parse(a.value)]:[...JSON.parse(a.value),...JSON.parse(b.value)];
      // Bulk Gmail messages can share the exact same timestamp and description.
      // Their message ID, rather than the date, identifies each confirmed email.
      const identity=x=>x.type==='interview'&&x.interviewId ? x.interviewId : x.gmailId ? JSON.stringify([x.type,x.gmailId]) : JSON.stringify([x.date,x.type,x.text]);
      const unique=new Map();
      for(const row of rows){
        const id=identity(row),previous=unique.get(id);
        // An unrelated edit on an old device must not undo an edited appointment.
        const modified=value=>Number.isFinite(Date.parse(value?.modifiedAt))?Date.parse(value.modifiedAt):0;
        if(!previous||modified(row)>=modified(previous))unique.set(id,row);
      }
      entries[key]={updated:latest.updated,value:JSON.stringify([...unique.values()].sort((x,y)=>y.date.localeCompare(x.date)||JSON.stringify(x).localeCompare(JSON.stringify(y))))};
    }else entries[key]=latest;
  }
  return {version:1,key:'tracking',updated:Object.values(entries).map(x=>x.updated).sort().at(-1)||trackingEpoch,entries};
}
function restorePrivateTracking(record){
  validatePrivateTracking(record);
  const times=trackingTimes();
  for(const [key,row] of Object.entries(record.entries)){localStorage.setItem(key,row.value);times[key]=row.updated}
  localStorage.setItem('mapaTrackingTimes_v1',JSON.stringify(times));
  trackingObserved=new Map(Object.entries(trackingValues()));
}
trackingObserved=new Map(Object.entries(trackingValues()));
function stampPrivateTracking(){
  const values=trackingValues(),times=trackingTimes();let changed=false;
  for(const [key,value] of Object.entries(values))if(trackingObserved.get(key)!==value){times[key]=new Date().toISOString();changed=true}
  trackingObserved=new Map(Object.entries(values));
  if(changed)localStorage.setItem('mapaTrackingTimes_v1',JSON.stringify(times));
}
document.addEventListener('private-data-changed',stampPrivateTracking);
document.addEventListener('candidature-history-changed',stampPrivateTracking);
