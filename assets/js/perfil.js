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
  document.getElementById('saveProfile').addEventListener('click',()=>{
    localStorage.setItem('mapaEscolesProfile_v1',JSON.stringify({name:name.value.trim(),bio:bio.value.trim()}));
    notice.textContent='✓ Perfil guardat en aquest navegador.';
  });
  document.getElementById('profileImport').addEventListener('change',async e=>{
    try{
      const file=e.target.files[0];if(!file)return;
      const p=JSON.parse(await file.text());
      if(!p||typeof p.name!=='string'||typeof p.bio!=='string')throw new Error('El perfil ha de tenir nom i formació.');
      localStorage.setItem('mapaEscolesProfile_v1',JSON.stringify({name:p.name,bio:p.bio}));paint();notice.textContent='✓ Perfil importat al navegador.';
    }catch(err){notice.textContent='No s’ha pogut importar: '+err.message}finally{e.target.value=''}
  });
  paint();
})();
