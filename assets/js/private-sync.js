// Google Drive appDataFolder only. Google access tokens stay in memory.
(() => {
  const CLIENT='326278371839-alsvhik4agj0jqp6ps16ve3j722q6p2k.apps.googleusercontent.com';
  const worker='https://el-meu-mapa-sync.dcarbonellcas.workers.dev';
  const persistent=typeof location!=='undefined'&&location.origin==='https://dcarbonellcas-cmyk.github.io'&&location.pathname==='/el-meu-mapa/';
  const sessionKey='mapaPrivateDriveSession_v1', flowKey='mapaPrivateDriveFlow_v1';
  const names={profile:'mapa-profile-v1.json',cv:'mapa-cv-v1.json',letter:'mapa-letter-v1.json',cvAlternative:'mapa-cvAlternative-v1.json',recommendation:'mapa-recommendation-v1.json',tracking:'mapa-tracking-v1.json'};
  const button=document.getElementById('connectPrivateDrive'),status=document.getElementById('privateSyncStatus');
  const draftButton=document.getElementById('connectDraftDrive'),draftStatus=document.getElementById('draftDriveStatus');
  let token='',expiry=0,busy=false,again=false,timer=null,connected=false,revision=0;
  let renewing=null;
  const say=text=>{status.textContent=text;draftStatus.textContent=text};
  const disableButtons=disabled=>{button.disabled=disabled;draftButton.disabled=disabled};
  const stamp=x=>Number.isFinite(Date.parse(x))?Date.parse(x):0;
  async function api(url,options={}){
    if(persistent){
      await ensureSession();
      if(!connected)throw Error('Inicia sessió per recuperar la còpia privada.');
    }else if(Date.now()>=expiry){token='';connected=false;throw Error('Torna a connectar Google. La còpia local es conserva.')}
    const r=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token}});
    if(!r.ok){
      if(r.status===401){
        token='';expiry=0;
        if(persistent)throw Error('Google ha interromput la sincronització. Es tornarà a provar automàticament.');
        connected=false;throw Error('La sessió de Google ha caducat. Torna a connectar; la còpia local es conserva.');
      }
      if(r.status===403)throw Error('Google no permet accedir a Drive. Cal habilitar Google Drive API i el permís de dades de l’aplicació al projecte de Google.');
      if(r.status===412)throw Error('Hi ha una actualització des d’un altre dispositiu. Torna a sincronitzar.');
      throw Error('No s’ha pogut sincronitzar amb Google Drive ('+r.status+'). La còpia local es conserva.');
    }
    return r;
  }
  async function listFiles(){
    const files=[];let page='';
    do{const q=new URLSearchParams({spaces:'appDataFolder',fields:'nextPageToken,files(id,name)',pageSize:'100'});if(page)q.set('pageToken',page);
      const data=await(await api('https://www.googleapis.com/drive/v3/files?'+q)).json();files.push(...(data.files||[]));page=data.nextPageToken||'';
    }while(page);
    return files;
  }
  function validate(key,r){
    if(!r||r.version!==1||r.key!==key||typeof r.updated!=='string'||!stamp(r.updated))throw Error('Còpia privada no vàlida. Es conserva la còpia local.');
    if(r.deleted!==undefined&&typeof r.deleted!=='boolean')throw Error('Estat del document no vàlid.');
    if(key==='tracking'){validatePrivateTracking(r);return}
    if(key==='profile'){
      if(typeof r.name!=='string'||typeof r.bio!=='string'||r.name.length>500||r.bio.length>100000|| (r.roleBio&& (typeof r.roleBio!=='object'||Array.isArray(r.roleBio)||Object.entries(r.roleBio).some(([k,v])=>!['infantil03','infantil36','infantil','primaria','monitoratge','vetlladora','direccio','coordinacio','menjador','extraescolars','acollida'].includes(k)||typeof v!=='string'||v.length>10000))))throw Error('Perfil privat no vàlid.');
    }else if(typeof r.name!=='string'||typeof r.type!=='string'||typeof r.data!=='string'||r.data.length>28000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(r.data))throw Error('Document privat no vàlid.');
  }
  async function ownRecord(key){
    if(key==='tracking')return privateTrackingSnapshot();
    if(key==='profile'){
      const p=candidateProfile();if(!p.name&&!p.bio)return null;
      return {version:1,key,name:p.name||'',bio:p.bio||'',roleBio:p.roleBio||{},updated:p.updated||'1970-01-01T00:00:00.001Z'};
    }
    const d=await getDoc(key,{includeDeleted:true});if(!d)return null;
    if(d.blob.size>20000000)throw Error('El document supera els 20 MB. La còpia local es conserva.');
    return {version:1,key,deleted:!!d.deleted,name:d.name,type:d.type,updated:d.updated||'1970-01-01T00:00:00.001Z',data:await blobBase64(d.blob)};
  }
  async function restore(key,r){
    if(key==='tracking')restorePrivateTracking(r);
    else if(key==='profile')localStorage.setItem('mapaEscolesProfile_v1',JSON.stringify({name:r.name,bio:r.bio,roleBio:r.roleBio||{},updated:r.updated}));
    else await saveDoc(key,new File([Uint8Array.from(atob(r.data),c=>c.charCodeAt(0))],r.name,{type:r.type}),{updated:r.updated,restoring:true,deleted:!!r.deleted});
    document.dispatchEvent(new CustomEvent('private-data-restored',{detail:{key}}));
  }
  async function upload(file,r,etag){
    const content=JSON.stringify(r);
    if(file)await api('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(file.id)+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})},body:content});
    else{
      const boundary='mapa_'+crypto.randomUUID().replace(/-/g,'');
      const metadata=JSON.stringify({name:names[r.key],parents:['appDataFolder']});
      const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+metadata+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+content+'\r\n--'+boundary+'--';
      await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    }
  }
  async function sync(){
    if(!connected)return;if(busy){again=true;return}
    busy=true;disableButtons(true);say('Sincronitzant perfil, documents, borses i seguiment amb la còpia privada…');
    try{
      const files=await listFiles();
      for(const key of Object.keys(names)){
        const matches=files.filter(x=>x.name===names[key]);if(matches.length>1)throw Error('Hi ha còpies duplicades de '+key+' a Drive. Cal revisar-les abans de continuar.');
        const file=matches[0],before=revision;let remote=null,etag=null;
        if(file){const r=await api('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'?alt=media');const raw=await r.text();if(raw.length>30000000)throw Error('La còpia privada és massa gran.');remote=JSON.parse(raw);validate(key,remote);etag=r.headers.get('ETag');}
        const own=await ownRecord(key);if(before!==revision){again=true;continue}
        if(key==='tracking'){
          const merged=mergePrivateTracking(own,remote);
          if(merged){await restore(key,merged);if(JSON.stringify(merged)!==JSON.stringify(remote))await upload(file,merged,etag)}
          continue;
        }
        if(remote&&(!own||stamp(remote.updated)>stamp(own.updated)))await restore(key,remote);
        else if(own&&(!remote||stamp(own.updated)>stamp(remote.updated)))await upload(file,own,etag);
      }
      say(persistent?'✓ Còpia privada sincronitzada.':'✓ Còpia privada sincronitzada. Guardat automàtic mentre la sessió de Google estigui connectada.');
      button.textContent='Sincronitzar ara';
    }catch(e){say(e.message||'No s’ha pogut sincronitzar. La còpia local es conserva.');if(!connected)button.textContent=persistent?'Iniciar sessió amb Google':'Tornar a connectar Google';}
    finally{busy=false;disableButtons(false);if(again){again=false;clearTimeout(timer);timer=setTimeout(sync,1500)}}
  }
  function clearSession(){
    token='';expiry=0;connected=false;
    button.textContent='Iniciar sessió amb Google';
  }
  async function workerRequest(path,body){
    const response=await fetch(worker+path,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',
      signal:AbortSignal.timeout(12000)
    });
    const result=await response.json();
    if(result.error==='wrong_account')throw Error('Tria el compte de Google amb què vas desar els documents.');
    if(response.status===401)return null;
    if(!response.ok)throw Error('La sincronització privada no està disponible ara. La còpia local es conserva.');
    return result;
  }
  function acceptSession(result){
    if(!result?.accessToken||!(Number(result.expiresIn)>60))throw Error('Google no ha completat la connexió.');
    if(result.session)localStorage.setItem(sessionKey,result.session);
    token=result.accessToken;
    expiry=Date.now()+(Number(result.expiresIn)-60)*1000;
    connected=true;
  }
  async function ensureSession(){
    const session=localStorage.getItem(sessionKey);
    if(!session){clearSession();return}
    if(token&&Date.now()<expiry)return;
    if(!renewing)renewing=(async()=>{
      const result=await workerRequest('/refresh',{session});
      if(session!==localStorage.getItem(sessionKey))return;
      if(result)acceptSession(result);
      else{localStorage.removeItem(sessionKey);clearSession()}
    })().finally(()=>{renewing=null});
    await renewing;
  }
  async function resume(){
    if(busy||!localStorage.getItem(sessionKey))return;
    try{
      await ensureSession();
      if(connected)await sync();
      else say('La sessió ha caducat. Inicia sessió per recuperar la còpia privada.');
    }catch(error){say(error.message||'La còpia local es conserva. Es tornarà a provar automàticament.')}
  }
  const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  async function startSession(){
    disableButtons(true);
    try{
      const state=base64url(crypto.getRandomValues(new Uint8Array(32)));
      const verifier=base64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      const result=await workerRequest('/start',{state,challenge});
      sessionStorage.setItem(flowKey,JSON.stringify({state,verifier,created:Date.now()}));
      location.assign(result.authorization);
    }catch(error){say(error.message);disableButtons(false)}
  }
  async function finishSession(){
    const params=new URLSearchParams(location.hash.slice(1));
    if(!params.has('drive_state')&&!params.has('drive_code')&&!params.has('drive_error'))return resume();
    history.replaceState(null,'',location.pathname+location.search);
    disableButtons(true);
    try{
      const flow=JSON.parse(sessionStorage.getItem(flowKey)||'null');
      sessionStorage.removeItem(flowKey);
      const code=params.get('drive_code');
      if(!flow||flow.state!==params.get('drive_state')||Date.now()-flow.created>600000||!code)throw Error('La connexió s’ha interromput. Torna a iniciar sessió.');
      acceptSession(await workerRequest('/exchange',{code,verifier:flow.verifier}));
      await sync();
    }catch(error){say(error.message);disableButtons(false)}
  }
  function connect(){
    if(persistent)return localStorage.getItem(sessionKey)?resume():startSession();
    if(connected&&Date.now()<expiry)return sync();
    if(!window.google?.accounts?.oauth2){say('Google encara no s’ha carregat. Revisa la connexió i torna-ho a provar.');return}
    connected=false;
    disableButtons(true);
    say('Tria el compte de Google amb què vas desar els documents.');
    let pending=true;
    const timeout=setTimeout(()=>fail('Google no ha completat la connexió. Permet la finestra emergent i torna-ho a provar.'),60000);
    function finish(){
      if(!pending)return false;
      pending=false;
      clearTimeout(timeout);
      return true;
    }
    function fail(message){
      if(!finish())return;
      disableButtons(false);
      say(message+' La còpia local es conserva.');
    }
    try{
      const client=google.accounts.oauth2.initTokenClient({
        client_id:CLIENT,scope:'https://www.googleapis.com/auth/drive.appdata',include_granted_scopes:false,
        callback:r=>{
          if(r.error||!r.access_token){fail('Google no ha autoritzat l’accés a la còpia privada.');return}
          if(!finish())return;
          token=r.access_token;
          expiry=Date.now()+Math.max(0,Number(r.expires_in||3600)-60)*1000;
          connected=true;
          return sync();
        },
        error_callback:error=>fail(error?.type==='popup_closed'
          ?'S’ha tancat la finestra de Google.'
          :'Obre el web directament a Safari o Chrome i permet les finestres emergents.')
      });
      client.requestAccessToken({prompt:'select_account'});
    }catch{fail('No s’ha pogut obrir Google. Torna-ho a provar des de Safari o Chrome.')}
  }
  document.addEventListener('private-data-changed',()=>{revision++;if(!connected)return;clearTimeout(timer);timer=setTimeout(sync,1500)});
  function syncVisible(){
    if(document.hidden)return;
    if(persistent)resume();
    else if(connected)sync();
  }
  document.addEventListener('visibilitychange',syncVisible);
  setInterval(syncVisible,60000);
  if(persistent){
    button.textContent='Iniciar sessió amb Google';
    const disconnect=document.createElement('button');
    disconnect.className='smallBtn';
    disconnect.type='button';
    disconnect.textContent='Desconnectar aquest navegador';
    disconnect.addEventListener('click',()=>{
      localStorage.removeItem(sessionKey);
      clearSession();
      say('Sessió tancada. La còpia local es conserva.');
    });
    button.after(disconnect);
    document.addEventListener('mapa-ready',finishSession,{once:true});
  }
  button.addEventListener('click',connect);
  draftButton.addEventListener('click',connect);
})();
