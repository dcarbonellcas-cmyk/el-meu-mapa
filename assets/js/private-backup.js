// Portable private copy: encryption and restoration run only in this browser.
const backupDocumentKeys=['cv','cvAlternative','letter','recommendation'];
function backupBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text)}
function backupBytes(text){if(typeof text!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('Fitxer de còpia no vàlid.');return Uint8Array.from(atob(text),char=>char.charCodeAt(0))}
async function backupKey(password,salt){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:310000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptPrivateBackup(payload,password){
  if(typeof password!=='string'||password.length<12)throw Error('Fes servir una contrasenya de 12 caràcters com a mínim.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('el-meu-mapa-backup-v1')},await backupKey(password,salt),new TextEncoder().encode(JSON.stringify(payload)));
  return {kind:'el-meu-mapa-private-backup',version:1,salt:backupBase64(salt),iv:backupBase64(iv),data:backupBase64(new Uint8Array(cipher))};
}
async function decryptPrivateBackup(envelope,password){
  if(!envelope||envelope.kind!=='el-meu-mapa-private-backup'||envelope.version!==1||typeof envelope.data!=='string'||envelope.data.length>160000000)throw Error('Aquest fitxer no és una còpia privada compatible.');
  const salt=backupBytes(envelope.salt),iv=backupBytes(envelope.iv),data=backupBytes(envelope.data);
  if(salt.length!==16||iv.length!==12||data.length<16)throw Error('Fitxer de còpia no vàlid.');
  try{
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('el-meu-mapa-backup-v1')},await backupKey(password,salt),data);
    return JSON.parse(new TextDecoder().decode(plain));
  }catch{throw Error('La contrasenya no és correcta o el fitxer està malmès. No s’ha canviat cap dada.')}
}
function validateBackupPayload(payload){
  if(!payload||payload.version!==1||!Array.isArray(payload.documents)||payload.documents.length>4)throw Error('Les dades de la còpia no són vàlides.');
  if(payload.profile){const p=payload.profile;
    if(typeof p.name!=='string'||p.name.length>500||typeof p.bio!=='string'||p.bio.length>100000||!Number.isFinite(Date.parse(p.updated)))throw Error('El perfil de la còpia no és vàlid.');
    if(p.roleBio&&(typeof p.roleBio!=='object'||Array.isArray(p.roleBio)||Object.entries(p.roleBio).some(([key,value])=>!['infantil03','infantil36','infantil','primaria','monitoratge','vetlladora','direccio','coordinacio','menjador','extraescolars','acollida'].includes(key)||typeof value!=='string'||value.length>10000)))throw Error('El perfil de la còpia no és vàlid.');
  }
  const seen=new Set();
  for(const row of payload.documents){
    if(!row||!backupDocumentKeys.includes(row.key)||seen.has(row.key)||typeof row.name!=='string'||row.name.length>500||typeof row.type!=='string'||row.type.length>200||typeof row.deleted!=='boolean'||!Number.isFinite(Date.parse(row.updated))||typeof row.data!=='string'||row.data.length>28000000)throw Error('Un document de la còpia no és vàlid.');
    if(backupBytes(row.data).length>20000000)throw Error('Un document supera els 20 MB.');seen.add(row.key);
  }
  if(payload.tracking)validatePrivateTracking(payload.tracking);
  if(payload.legacyRows&&(!Array.isArray(payload.legacyRows)||payload.legacyRows.length>30000))throw Error('L’historial antic no és vàlid.');
  return payload;
}
async function collectPrivateBackup(){
  const profile=candidateProfile(),documents=[];
  for(const key of backupDocumentKeys){const row=await getDoc(key,{includeDeleted:true});if(!row)continue;
    if(row.blob.size>20000000)throw Error('Un document supera els 20 MB.');
    documents.push({key,name:row.name,type:row.type,deleted:!!row.deleted,updated:row.updated||trackingEpoch,data:await blobBase64(row.blob)});
  }
  const payload={version:1,createdAt:new Date().toISOString(),profile:profile.name||profile.bio?{name:profile.name||'',bio:profile.bio||'',roleBio:profile.roleBio||{},updated:profile.updated||trackingEpoch}:null,documents,tracking:privateTrackingSnapshot(),legacyRows:loadLegacyRows()};
  return validateBackupPayload(payload);
}
async function restorePortableBackup(payload){
  validateBackupPayload(payload); // Complete validation precedes every storage write.
  const writes=new Map(),docs=[];
  if(payload.profile&&(!candidateProfile().updated||Date.parse(payload.profile.updated)>Date.parse(candidateProfile().updated)))writes.set('mapaEscolesProfile_v1',JSON.stringify(payload.profile));
  const tracking=mergePrivateTracking(privateTrackingSnapshot(),payload.tracking);
  if(tracking){const times=trackingTimes();for(const [key,row] of Object.entries(tracking.entries)){writes.set(key,row.value);times[key]=row.updated}writes.set('mapaTrackingTimes_v1',JSON.stringify(times))}
  if(payload.legacyRows?.length){const unique=new Map([...loadLegacyRows(),...payload.legacyRows].map(row=>[JSON.stringify(row),row]));writes.set('mapaEscolesLegacyRows_v1',JSON.stringify([...unique.values()]))}
  for(const row of payload.documents){const own=await getDoc(row.key,{includeDeleted:true});if(!own||Date.parse(row.updated)>Date.parse(own.updated))docs.push({...row,blob:new Blob([backupBytes(row.data)],{type:row.type})})}
  const previous=new Map([...writes.keys()].map(key=>[key,localStorage.getItem(key)]));
  try{
    for(const [key,value] of writes)localStorage.setItem(key,value);
    if(docs.length){const db=await docDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DOC_STORE,'readwrite');for(const row of docs){const {key,data,...record}=row;tx.objectStore(DOC_STORE).put(record,key)}tx.oncomplete=()=>{db.close();resolve()};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('No s’han pogut guardar els documents.'))}})}
  }catch(error){for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}throw error}
  trackingObserved=new Map(Object.entries(trackingValues()));
  document.dispatchEvent(new CustomEvent('private-data-restored',{detail:{key:'portable-backup'}}));
  document.dispatchEvent(new Event('candidature-history-changed'));
  // Do not automatically upload an imported copy to an external account.
  return {documents:docs.length,tracking:Object.keys(tracking?.entries||{}).length};
}

(() => {
  const host=document.querySelector('#docsOverlay .docsInner');
  const card=document.createElement('section');card.className='docCard portableBackupCard';card.setAttribute('aria-label','Passar dades entre dispositius');
  card.innerHTML='<div class="docMeta"><h2>Passar les dades al mòbil sense connectar Google</h2><p>Desa un fitxer privat en aquest ordinador i carrega’l al mòbil. Inclou el perfil, els dos CV, les cartes, les candidatures, les entrevistes i les inscripcions web. No inclou contrasenyes ni accessos de Google, ni els missatges complets de Gmail.</p><ol><li>A l’ordinador, escriu una contrasenya i prem <b>Desar còpia privada</b>.</li><li>Passa el fitxer al mòbil amb AirDrop o desa’l als teus Fitxers.</li><li>Al mòbil, crea primer la icona amb l’enllaç d’aquest mapa. Després obre aquesta icona, entra a Documents, escriu la mateixa contrasenya i prem <b>Carregar còpia privada</b>.</li></ol><p>Si fas servir la icona, carrega la còpia dins de la icona: les dades de Safari poden quedar separades. És un traspàs manual: quan facis canvis en un dispositiu, hauràs de desar i carregar una còpia nova a l’altre. Els registres es combinen i es conserven els documents més recents.</p><label for="portableBackupPassword">Contrasenya de la còpia (mínim 12 caràcters)</label><input id="portableBackupPassword" type="password" autocomplete="off" minlength="12"><p class="muted">Guarda aquesta contrasenya: no la podem recuperar. No la facis servir com a contrasenya de Google.</p><div class="docActions"><button type="button" class="smallBtn" id="portableBackupSave">Desar còpia privada</button><label class="smallBtn">Carregar còpia privada<input id="portableBackupLoad" type="file" accept="application/json,.json" hidden></label></div><p id="portableBackupStatus" role="status"></p><p>Enllaç del mapa: <a href="https://dcarbonellcas-cmyk.github.io/el-meu-mapa/">Obrir la mateixa aplicació</a></p><p id="portableBackupDevice" class="muted"></p></div>';
  host.querySelector('header')?.after(card);
  const password=card.querySelector('#portableBackupPassword'),status=card.querySelector('#portableBackupStatus'),save=card.querySelector('#portableBackupSave'),load=card.querySelector('#portableBackupLoad');
  card.querySelector('#portableBackupDevice').textContent='Adreça oberta: '+location.origin+location.pathname+' · '+((window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone)?'Obert des de la icona':'Obert al navegador')+' · Versió: '+(document.querySelector('meta[name="mapa-release"]')?.content||'local');
  let busy=false,downloadUrl='';
  save.addEventListener('click',async()=>{if(busy)return;busy=true;save.disabled=true;
    try{status.textContent='Preparant la còpia privada…';const payload=await collectPrivateBackup();
      if(!payload.profile&&!payload.documents.length&&!payload.tracking&&!payload.legacyRows.length)throw Error('Aquest navegador no té dades per copiar. Obre el mapa a l’ordinador on sí que les veus.');
      const envelope=await encryptPrivateBackup(payload,password.value),blob=new Blob([JSON.stringify(envelope)],{type:'application/json'});
      if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=downloadUrl;link.download='El-meu-mapa-copia-privada-'+new Date().toISOString().slice(0,10)+'.json';link.textContent='Descarregar la còpia preparada';
      password.value='';status.textContent='Còpia preparada: '+payload.documents.length+' documents i '+Object.keys(payload.tracking?.entries||{}).length+' registres de seguiment. Passa el fitxer al mòbil i carrega’l amb la mateixa contrasenya. ';status.append(link);link.click();
    }catch(error){status.textContent=error.message}finally{busy=false;save.disabled=false}
  });
  load.addEventListener('change',async()=>{const file=load.files[0];if(!file||busy)return;busy=true;save.disabled=true;
    try{if(file.size>160000000)throw Error('La còpia és massa gran.');if(!password.value)throw Error('Escriu la contrasenya amb què vas desar la còpia.');status.textContent='Comprovant la còpia…';const payload=validateBackupPayload(await decryptPrivateBackup(JSON.parse(await file.text()),password.value));
      if(!confirm('Carregar aquesta còpia privada? Els historials es combinaran i es conservaran els documents més recents.'))return;
      const result=await restorePortableBackup(payload);password.value='';status.textContent='Còpia carregada: '+result.documents+' documents recuperats i '+result.tracking+' registres de seguiment disponibles. Ja pots revisar Educació i Calendari.';
    }catch(error){status.textContent=error.message||'No s’ha pogut carregar. La còpia local es conserva.'}finally{busy=false;save.disabled=false;load.value=''}
  });
})();
