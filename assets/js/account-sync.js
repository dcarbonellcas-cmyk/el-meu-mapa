// Account gate and automatic synchronisation; existing browser data is preserved.
(() => {
  const {AccountStore,bytes,b64,digest}=MapaAccountCore;
  const tokenKey='mapaAccountToken_v1',ownerKey='mapaAccountOwner_v1',deviceKey='mapaAccountDevice_v1';
  const store=new AccountStore({token:localStorage.getItem(tokenKey)||''});
  let user=null,busy=false,applying=false,revision=0,timer,recordId='',lastHash='',mode='login';
  const cache=new Map(),refs=new Map(),applied=new Map();
  const gate=document.createElement('section');gate.id='accountGate';gate.setAttribute('aria-label','Accés al teu mapa');
  gate.innerHTML='<div class="accountCard"><img src="assets/icons/logo-dc.png" width="58" height="58" alt=""><h1>El teu mapa, a tot arreu</h1><p>Entra amb el mateix compte al mòbil i a l’ordinador per compartir les dades.</p><form id="accountForm"><label for="accountEmail">Correu electrònic</label><input id="accountEmail" type="email" autocomplete="username" required><label for="accountPassword">Contrasenya</label><input id="accountPassword" type="password" autocomplete="current-password" required><label for="accountOtp" hidden>Codi rebut per correu</label><input id="accountOtp" inputmode="numeric" autocomplete="one-time-code" hidden><button class="smallBtn" id="accountSubmit" type="submit">Entrar</button></form><p id="accountStatus" role="status">Comprovant l’accés…</p><div class="accountLinks"><button type="button" id="accountRegister">Crear el meu compte</button><button type="button" id="accountResend">Reenviar el codi de verificació</button><button type="button" id="accountReset">He oblidat la contrasenya</button></div><p class="muted">El compte i les còpies privades es guarden a Base44. La primera vegada, revisa les dades a l’ordinador on les tens i activa’n la sincronització. No s’envien correus de candidatura automàticament.</p></div>';
  document.body.append(gate);document.getElementById('accountLoading')?.remove();
  const form=gate.querySelector('form'),email=gate.querySelector('#accountEmail'),password=gate.querySelector('#accountPassword'),otp=gate.querySelector('#accountOtp'),submit=gate.querySelector('#accountSubmit'),status=gate.querySelector('#accountStatus');
  const bar=document.createElement('div');bar.id='accountBar';bar.innerHTML='<span role="status"></span><button type="button">Compte</button>';document.body.append(bar);
  const logout=document.createElement('button');logout.type='button';logout.textContent='Tancar sessió';logout.onclick=()=>{user=null;store.token='';localStorage.removeItem(tokenKey);window.MAPA_ACCOUNT_ACTIVE=false;lock(true);say('Sessió tancada. La còpia local es conserva en aquest dispositiu.');};bar.append(logout);
  const say=text=>{status.textContent=text;bar.querySelector('span').textContent=text};
  const lock=show=>{gate.hidden=!show;for(const el of document.body.children)if(el!==gate&&el!==bar&&el.tagName!=='SCRIPT'){el.inert=show}bar.hidden=show};
  bar.querySelector('button').onclick=()=>{lock(true);say(user?'Compte connectat: '+user.email+'. Torna a entrar per obrir el mapa.':'Entra per sincronitzar les dades.')};
  function setMode(next){mode=next;otp.hidden=next!=='verify';otp.previousElementSibling.hidden=otp.hidden;otp.required=!otp.hidden;password.required=!['verify','reset'].includes(next);password.hidden=!password.required;password.previousElementSibling.hidden=password.hidden;submit.textContent=next==='register'?'Crear compte':next==='verify'?'Confirmar codi':next==='reset'?'Recuperar contrasenya':'Entrar';say(next==='register'?'Crea el compte una sola vegada. Rebràs un codi de verificació.':'Escriu les dades del teu compte.');}
  gate.querySelector('#accountRegister').onclick=()=>setMode(mode==='register'?'login':'register');
  gate.querySelector('#accountReset').onclick=()=>setMode('reset');
  let resendUntil=0;
  gate.querySelector('#accountResend').onclick=async()=>{
    if(!email.reportValidity())return;
    const button=gate.querySelector('#accountResend');
    if(Date.now()<resendUntil){say('Espera un minut abans de tornar a demanar el codi.');return}
    button.disabled=true;
    try{say('Demanant un altre codi…');await store.resend(email.value.trim());setMode('verify');resendUntil=Date.now()+60000;say('S’ha sol·licitat un altre codi. Revisa també Correu brossa. Si el compte ja estava verificat, torna a Entrar.');}
    catch(error){say(error.message)}finally{button.disabled=false}
  };

  async function attach(){
    const identity=await store.me();if(!identity?.id)throw Error('No s’ha pogut comprovar el compte.');
    const bound=localStorage.getItem(ownerKey);
    if(bound&&bound!==identity.id)throw Error('Aquest navegador té dades d’un altre compte. Per conservar-les separades, entra amb el compte original o utilitza un altre perfil del navegador.');
    if(!bound){const local=await collectPrivateBackup();const hasData=local.profile||local.documents.length||Object.keys(local.tracking?.entries||{}).length||local.legacyRows.length;
      if(hasData&&!confirm('Vols combinar les dades d’aquest dispositiu amb el teu compte '+identity.email+'? Es guardaran de manera privada a Base44 i es conservaran els registres i documents més recents.'))throw Error('No s’ha activat la sincronització. Les dades locals es conserven.');
      localStorage.setItem(ownerKey,identity.id);
    }
    user=identity;localStorage.setItem(tokenKey,store.token);window.MAPA_ACCOUNT_ACTIVE=true;
    if(!localStorage.getItem(deviceKey))localStorage.setItem(deviceKey,crypto.randomUUID());
    // A validated account may open the app while cloud work continues.
    lock(false);say('Compte connectat · preparant la sincronització…');
    sync().catch(()=>{});
  }
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;
    try{say('Connectant…');
      if(mode==='register'){if(password.value.length<12)throw Error('Fes servir una contrasenya de 12 caràcters com a mínim.');await store.register(email.value.trim(),password.value);password.value='';setMode('verify');say('T’hem enviat un codi al correu. Escriu-lo aquí.');return}
      if(mode==='reset'){await store.reset(email.value.trim());setMode('login');say('Si el compte existeix, rebràs un correu per recuperar la contrasenya.');return}
      if(mode==='verify'){const result=await store.verify(email.value.trim(),otp.value.trim());if(!result.access_token)throw Error('La verificació no s’ha completat.');store.token=result.access_token;otp.value=''}else await store.login(email.value.trim(),password.value);
      password.value='';setMode('login');await attach();
    }catch(error){password.value='';say(error.message)}finally{submit.disabled=false}
  };
  async function readManifest(row){
    if(row.format_version!==1||typeof row.payload_ref!=='string')throw Error('La còpia del compte no és compatible.');
    const ref=JSON.parse(row.payload_ref),cached=cache.get(row.id);if(cached?.ref===row.payload_ref)return cached.payload;
    const payload=JSON.parse(new TextDecoder().decode(await store.download(ref,25000000)));
    if(!payload||payload.version!==1||!Array.isArray(payload.documents)||payload.documents.length>4)throw Error('Còpia del compte no vàlida.');
    const complete={...payload,documents:[]};
    for(const doc of payload.documents){if(!backupDocumentKeys.includes(doc.key))throw Error('Document desconegut.');
      let data='';{const key=doc.ref?.hash;if(refs.has(key))data=refs.get(key).data;else{data=b64(new Uint8Array(await store.download(doc.ref)));refs.set(key,{ref:doc.ref,data})}}
      complete.documents.push({...doc,data});
    }
    validateBackupPayload(complete);cache.set(row.id,{ref:row.payload_ref,payload:complete});return complete;
  }
  async function doSync(){
    if(!user||busy)return;busy=true;const ownRevision=revision;
    try{say('Desant i recuperant els canvis…');
      const rows=await store.list(user.id),device=localStorage.getItem(deviceKey);recordId=rows.find(x=>x.device_id===device)?.id||recordId;
      // Fetch and validate every remote snapshot before changing local data.
      const payloads=[];for(const row of rows)payloads.push(await readManifest(row));
      applying=true;try{for(let i=0;i<payloads.length;i++){const row=rows[i];if(applied.get(row.id)!==row.payload_ref){await restorePortableBackup(payloads[i]);applied.set(row.id,row.payload_ref)}}}finally{applying=false}
      say('Comprovant els documents i les dades d’aquest dispositiu…');
      const local=await collectPrivateBackup();const stable={...local};delete stable.createdAt;
      const hash=await digest(new TextEncoder().encode(JSON.stringify(stable)));
      if(hash!==lastHash){
        const documents=[];
        for(const doc of local.documents){say('Desant document '+(documents.length+1)+' de '+local.documents.length+'…');const {data,...meta}=doc;{const raw=bytes(data),key=await digest(raw);let ref=refs.get(key)?.ref;if(!ref){ref=await store.upload(raw);refs.set(key,{ref,data})}documents.push({...meta,ref})}}
        say('Desant el seguiment i confirmant la còpia privada…');
        const manifest={...local,documents};const manifestRef=await store.upload(new TextEncoder().encode(JSON.stringify(manifest)));
        const saved=await store.save(recordId,{device_id:device,payload_ref:JSON.stringify(manifestRef),format_version:1});if(!saved?.id)throw Error('El servei no ha confirmat el desament.');recordId=saved.id;lastHash=hash;
      }
      say('Canvis sincronitzats · '+new Date().toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'}));
    }catch(error){say('Sincronització pendent: '+error.message);if(error.status===401){user=null;window.MAPA_ACCOUNT_ACTIVE=false;localStorage.removeItem(tokenKey);lock(true)}throw error}
    finally{busy=false;if(user&&revision!==ownRevision)schedule()}
  }
  async function sync(){if(navigator.locks)return navigator.locks.request('mapa-account-sync',()=>doSync());return doSync()}
  function schedule(){if(applying||!user)return;revision++;clearTimeout(timer);timer=setTimeout(()=>sync().catch(()=>{}),2500)}
  document.addEventListener('private-data-changed',schedule);document.addEventListener('candidature-history-changed',schedule);
  document.addEventListener('private-data-restored',()=>{if(!applying)schedule()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)sync().catch(()=>{})});window.addEventListener('online',()=>{if(user)sync().catch(()=>{})});
  window.addEventListener('storage',event=>{if(privateTrackingKey(event.key||'')||event.key==='mapaEscolesProfile_v1')schedule()});
  setInterval(()=>{if(!document.hidden&&user&&!/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||''))sync().catch(()=>{})},60000);
  lock(true);if(store.token)attach().catch(error=>say(error.message));else say('Entra amb el teu compte per obrir el mapa, o crea’l si encara no en tens.');
})();
