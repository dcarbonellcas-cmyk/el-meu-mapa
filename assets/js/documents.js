let currentDraftSchoolId=null;
const DOC_DB='mapaEscolesDocuments', DOC_STORE='files';
function docDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DOC_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DOC_STORE))r.result.createObjectStore(DOC_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveDoc(key,file,options={}){
  const db=await docDB();
  await new Promise((resolve,reject)=>{const tx=db.transaction(DOC_STORE,'readwrite');tx.objectStore(DOC_STORE).put({name:file.name,type:file.type||'application/octet-stream',blob:file,deleted:!!options.deleted,updated:options.updated||new Date().toISOString()},key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||new Error('No s’ha guardat el document'))}});
  if(typeof navigator!=='undefined'&&navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
  if(!options.restoring)document.dispatchEvent(new Event('private-data-changed'));
}
async function getDoc(key,options={}){const db=await docDB();return new Promise((resolve,reject)=>{const r=db.transaction(DOC_STORE,'readonly').objectStore(DOC_STORE).get(key);r.onsuccess=()=>{db.close();resolve(r.result&&(!r.result.deleted||options.includeDeleted)?r.result:null)};r.onerror=()=>reject(r.error)})}
async function refreshDocs(){for(const [key,nameId,btnId] of [['cv','cvFileName','cvOpen'],['letter','letterFileName','letterOpen']]){let d=null;try{d=await getDoc(key)}catch(e){};document.getElementById(nameId).textContent=d?('✓ '+d.name):'Cap fitxer guardat';document.getElementById(btnId).style.display=d?'inline-block':'none'}await refreshOptionalDocs()}
async function openDoc(key){const d=await getDoc(key);if(!d)return;const u=URL.createObjectURL(d.blob);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
function showMailDraft(s,subject,body){
  currentDraftSchoolId=String(s.id);
  clearManualMail();
  document.getElementById('includeCvAlternative').checked=true;
  document.getElementById('includeRecommendation').checked=true;
  document.getElementById('draftTo').value=s.email||'';
  document.getElementById('draftSubject').value=subject||'';
  const cvDigitalUrl='https://diana-carbonell-curriculum.dcarbonellcas.chatgpt.site/';
  const missatge=String(body||'');
  document.getElementById('draftBody').value=missatge.includes(cvDigitalUrl)?missatge:missatge.trimEnd()+'\n\nPodeu consultar el meu currículum professional aquí:\n'+cvDigitalUrl;
  if(window.beginTailoredDraft)window.beginTailoredDraft(s);
  document.getElementById('copyNotice').style.display='none';
  document.getElementById('gmailNotice').style.display='none';
  document.getElementById('mailDraftModal').style.display='flex';
  refreshDocs();
}
function closeMailDraft(){
  clearManualMail();
  document.getElementById('mailDraftModal').style.display='none';
}
async function copyTextSafe(txt){
  try{ await navigator.clipboard.writeText(txt); }
  catch(e){
    const t=document.createElement('textarea'); t.value=txt; t.style.position='fixed'; t.style.opacity='0';
    document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
  }
  document.getElementById('copyNotice').style.display='block';
}
document.getElementById('closeMailDraft').addEventListener('click',closeMailDraft);
document.getElementById('closeMailDraft2').addEventListener('click',closeMailDraft);
document.getElementById('mailDraftModal').addEventListener('click',e=>{if(e.target.id==='mailDraftModal')closeMailDraft()});
document.getElementById('copyDraft').addEventListener('click',()=>copyTextSafe(
  'Per a: '+document.getElementById('draftTo').value+'\nAssumpte: '+document.getElementById('draftSubject').value+'\n\n'+document.getElementById('draftBody').value
));
document.getElementById('copyBody').addEventListener('click',()=>copyTextSafe(document.getElementById('draftBody').value));
function bindDocumentPicker(inputId,key,refresh){
  document.getElementById(inputId).addEventListener('change',async event=>{
    const input=event.target,file=input.files[0];
    if(!file)return;
    try{
      await saveDoc(key,file);
      clearManualMail();
      await refresh();
    }catch{
      alert('No s’ha pogut guardar el document. Torna-ho a provar.');
    }finally{input.value=''}
  });
}
bindDocumentPicker('cvFileInput','cv',refreshDocs);
bindDocumentPicker('letterFileInput','letter',refreshDocs);
document.getElementById('cvOpen').addEventListener('click',()=>openDoc('cv'));
document.getElementById('letterOpen').addEventListener('click',()=>openDoc('letter'));

async function refreshOptionalDocs(){
  for(const [key,id] of [['cvAlternative','draftCvAlternativeName'],['recommendation','draftRecommendationName']]){
    const file=await getDoc(key);
    document.getElementById(id).textContent=file?'— '+file.name:'— cap fitxer disponible en aquest dispositiu';
  }
  const cv=await getDoc('cv'),letter=await getDoc('letter');
  document.getElementById('draftAttachmentsNotice').textContent=(!cv||!letter)?'Falta el currículum complet o la carta de presentació. Selecciona’ls abans d’enviar.':'';
}
async function candidatureDocuments(){
  const cv=await getDoc('cv'),letter=await getDoc('letter');
  if(!cv||!letter)throw new Error('Falta el currículum complet o la carta de presentació. Recupera els adjunts de Google Drive o selecciona els fitxers abans d’enviar.');
  const docs=[cv,letter];
  for(const [key,id] of [['cvAlternative','includeCvAlternative'],['recommendation','includeRecommendation']]){
    if(!document.getElementById(id).checked)continue;
    const file=await getDoc(key);
    if(file)docs.push(file);
  }
  return docs;
}

const manualMailOptions=document.getElementById('manualMailOptions');
let manualMailUrls=[],manualMailRequest=0;
function clearManualMail(){
  manualMailRequest++;
  manualMailUrls.forEach(url=>URL.revokeObjectURL(url));
  manualMailUrls=[];
  manualMailOptions.replaceChildren();
  manualMailOptions.hidden=true;
}
document.getElementById('manualMail')?.addEventListener('click',async ()=>{
  clearManualMail();
  const request=manualMailRequest;
  const to=document.getElementById('draftTo').value.trim();
  const subject=document.getElementById('draftSubject').value;
  const body=document.getElementById('draftBody').value;
  try{
    if(!to||/[\r\n]/.test(to))throw new Error('Correu del destinatari no vàlid.');
    const docs=await candidatureDocuments();
    if(request!==manualMailRequest)return;
    const instructions=document.createElement('p');
    instructions.textContent='Descarrega els documents d’aquesta llista. Obre Gmail, adjunta’ls i revisa la candidatura abans de prémer Enviar. Obrir el correu no el marca com a enviat.';
    const files=document.createElement('ul');
    for(const doc of docs){
      const item=document.createElement('li'),link=document.createElement('a');
      link.href=URL.createObjectURL(doc.blob);
      manualMailUrls.push(link.href);
      link.download=doc.name;
      link.textContent=doc.name;
      item.append(link);
      files.append(item);
    }
    const compose=document.createElement('a');
    compose.className='smallBtn';
    compose.href='mailto:'+encodeURIComponent(to).replace(/%40/g,'@').replace(/%2C/g,',')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    compose.textContent='Obrir a la meva app de correu';
    const gmail=document.createElement('a');gmail.className='smallBtn';gmail.target='_blank';gmail.rel='noopener noreferrer';
    gmail.href='https://mail.google.com/mail/?'+new URLSearchParams({view:'cm',fs:'1',to,su:subject,body});
    gmail.textContent='Obrir la candidatura a Gmail';
    manualMailOptions.append(instructions,files,gmail,compose);
    manualMailOptions.hidden=false;
  }catch(error){
    if(request===manualMailRequest)gmailNotice(error.message);
  }
});
for(const id of ['draftSubject','draftBody','includeCvAlternative','includeRecommendation']){
  document.getElementById(id).addEventListener('input',clearManualMail);
}
document.addEventListener('private-data-restored',event=>{
  if(event.detail?.key!=='tracking')clearManualMail();
});

async function setDocumentDeleted(key,deleted){const record=await getDoc(key,{includeDeleted:true});if(!record)return;await saveDoc(key,new File([record.blob],record.name,{type:record.type}),{deleted});document.dispatchEvent(new Event('private-data-restored'));}

(() => {
  const slots=[['cv','docsCvOpen','currículum complet'],['cvAlternative','docsCvAlternativeOpen','segon currículum'],['letter','docsLetterOpen','carta de presentació'],['recommendation','docsRecommendationOpen','carta de recomanació']];
  async function updateDocumentActions(){
    for(const [key,open,label] of slots){
      const host=document.getElementById(open)?.parentElement;if(!host)continue;
      let button=host.querySelector('[data-document-trash]');
      if(!button){button=document.createElement('button');button.type='button';button.className='smallBtn';button.dataset.documentTrash=key;host.append(button);
        button.addEventListener('click',async()=>{button.disabled=true;try{const record=await getDoc(key,{includeDeleted:true});if(!record)return;if(!record.deleted&&!confirm('Vols moure aquest document a la paperera? El podràs recuperar amb «Restaurar». Si connectes Google, el canvi se sincronitzarà amb els altres dispositius.'))return;await setDocumentDeleted(key,!record.deleted)}catch(e){alert('No s’ha pogut canviar el document: '+e.message)}finally{button.disabled=false;updateDocumentActions()}});
      }
      try{const record=await getDoc(key,{includeDeleted:true});button.hidden=!record;button.textContent=record?.deleted?'↶ Restaurar':'🗑 Paperera';button.setAttribute('aria-label',(record?.deleted?'Restaurar ':'Moure a la paperera: ')+label)}catch{button.hidden=true}
    }
  }
  document.addEventListener('private-data-changed',updateDocumentActions);
  document.addEventListener('private-data-restored',updateDocumentActions);
  updateDocumentActions();
})();
