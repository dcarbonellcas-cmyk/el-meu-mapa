function candidateProfile(){
  try{return JSON.parse(localStorage.getItem('mapaEscolesProfile_v1')||'{}')}catch{return {}}
}
function candidateName(){return candidateProfile().name||'[El teu nom]'}
function candidateBio(){return candidateProfile().bio||'[La teva formació i experiència]'}
function loadLegacyRows(){
  try{const rows=JSON.parse(localStorage.getItem('mapaEscolesLegacyRows_v1')||'[]');return Array.isArray(rows)?rows:[]}catch{return []}
}
(function(){
  const name=document.getElementById('candidateName'),bio=document.getElementById('candidateBio'),notice=document.getElementById('profileNotice');
  function paint(){const p=candidateProfile();name.value=p.name||'';bio.value=p.bio||''}
  function save(){
    try{
      const old=candidateProfile(),p={name:name.value.trim(),bio:bio.value.trim()};
      if(p.name===old.name&&p.bio===old.bio)return;
      localStorage.setItem('mapaEscolesProfile_v1',JSON.stringify({...p,updated:new Date().toISOString()}));
      notice.textContent='✓ Perfil guardat automàticament en aquest dispositiu.';
      document.dispatchEvent(new Event('private-data-changed'));
    }catch{notice.textContent='No s’ha pogut guardar. Conserva una còpia del text i revisa l’espai del navegador.'}
  }
  name.addEventListener('input',save);bio.addEventListener('input',save);
  document.getElementById('saveProfile').addEventListener('click',save);
  document.getElementById('profileImport').addEventListener('change',async e=>{
    try{
      const file=e.target.files[0];if(!file)return;
      const p=JSON.parse(await file.text());
      if(!p||typeof p.name!=='string'||typeof p.bio!=='string')throw new Error('El perfil ha de tenir nom i formació.');
      name.value=p.name;bio.value=p.bio;save();
    }catch(err){notice.textContent='No s’ha pogut importar: '+err.message}finally{e.target.value=''}
  });
  document.addEventListener('private-data-restored',paint);
  window.addEventListener('storage',e=>{if(e.key==='mapaEscolesProfile_v1')paint()});
  paint();
})();
