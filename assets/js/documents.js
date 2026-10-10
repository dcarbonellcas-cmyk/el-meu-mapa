let currentDraftSchoolId=null;
const DOC_DB='mapaEscolesDocuments', DOC_STORE='files';
function docDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DOC_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DOC_STORE))r.result.createObjectStore(DOC_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveDoc(key,file){const db=await docDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DOC_STORE,'readwrite');tx.objectStore(DOC_STORE).put({name:file.name,type:file.type||'application/octet-stream',blob:file,updated:new Date().toISOString()},key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}
async function getDoc(key){const db=await docDB();return new Promise((resolve,reject)=>{const r=db.transaction(DOC_STORE,'readonly').objectStore(DOC_STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
async function refreshDocs(){for(const [key,nameId,btnId] of [['cv','cvFileName','cvOpen'],['letter','letterFileName','letterOpen']]){let d=null;try{d=await getDoc(key)}catch(e){};document.getElementById(nameId).textContent=d?('✓ '+d.name):'Cap fitxer guardat';document.getElementById(btnId).style.display=d?'inline-block':'none'}}
async function openDoc(key){const d=await getDoc(key);if(!d)return;const u=URL.createObjectURL(d.blob);window.open(u,'_blank');setTimeout(()=>URL.revokeObjectURL(u),60000)}
function showMailDraft(s,subject,body){
  currentDraftSchoolId=String(s.id);
  document.getElementById('draftTo').value=s.email||'';
  document.getElementById('draftSubject').value=subject||'';
  document.getElementById('draftBody').value=body||'';
  document.getElementById('copyNotice').style.display='none';
  document.getElementById('gmailNotice').style.display='none';
  document.getElementById('mailDraftModal').style.display='flex';
  refreshDocs();
}
function closeMailDraft(){document.getElementById('mailDraftModal').style.display='none'}
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
document.getElementById('cvFileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(f){await saveDoc('cv',f);await refreshDocs();}e.target.value=''});
document.getElementById('letterFileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(f){await saveDoc('letter',f);await refreshDocs();}e.target.value=''});
document.getElementById('cvOpen').addEventListener('click',()=>openDoc('cv'));
document.getElementById('letterOpen').addEventListener('click',()=>openDoc('letter'));
