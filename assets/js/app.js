// Classic scripts retain the shared functions used by existing controls.
// Sites keeps the public daily feed; account data never passes through GitHub.
window.mapaPublicData=async function(name){
  const allowed=['centres.json','entitats.json','centres-arxivats.json','ofertes.json','sincronitzacio.json','gmail-xifrat.json'];
  if(!allowed.includes(name))throw Error('Font pública desconeguda.');
  const local='assets/data/'+name;
  const remote=location.hostname==='el-meu-mapa-escoles.dolca1021.chatgpt.site';
  const paths=remote?['https://dcarbonellcas-cmyk.github.io/el-meu-mapa/'+local,local]:[local];
  for(const path of paths){try{const r=await fetch(path,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)continue;return await r.json()}catch{}}
  throw Error('Dades no disponibles: '+name);
};
(async function(){
  function loadScript(path){return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=path+'?v='+encodeURIComponent(document.querySelector('meta[name="mapa-release"]')?.content||'20261113-mobil');script.async=false;
    script.onload=resolve;script.onerror=()=>reject(new Error('No s’ha pogut carregar '+path));document.body.appendChild(script);
  })}
  try{
    if(location.protocol==='file:'){
      // Generated from the JSON files; permits the original double-click preview.
      await loadScript('assets/data/dades-local.js');
    }else{
      const [centres,entitats,archived]=await Promise.all(['centres.json','entitats.json','centres-arxivats.json'].map(window.mapaPublicData));
      window.MAPA_DATA={centres,entitats,archived};
    }
    if(typeof L==='undefined')throw new Error('No s’ha pogut carregar el mapa. Comprova la connexió a Internet i recarrega la pàgina.');
    for(const file of ['perfil','renovacions','mapes','candidatura-manual','infantil','candidatures','documents','candidatura-personalitzada','ofertes','lleure','enviaments','gmail','gmail-feed','private-tracking','private-sync','calendar','calendar-gmail','navegacio','historial','candidatures-entitats','directoris','fonts','educacio','borses','private-backup','account-sync-core','account-sync']){
      await loadScript('assets/js/'+file+'.js');
    }
    window.MAPA_READY=true;
    document.dispatchEvent(new Event('mapa-ready'));
  }catch(error){
    console.error(error);document.getElementById('accountLoading')?.remove();
    const notice=document.createElement('div');notice.setAttribute('role','alert');
    notice.style.cssText='position:fixed;inset:80px 20px auto;z-index:30000;background:#fff4e5;padding:20px;border:1px solid #f5b942;border-radius:12px';
    notice.textContent=error.message;document.body.appendChild(notice);
  }
})();
