// Classic scripts retain the shared functions used by existing controls.
(async function(){
  function loadScript(path){return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=path;script.async=false;
    script.onload=resolve;script.onerror=()=>reject(new Error('No s’ha pogut carregar '+path));document.body.appendChild(script);
  })}
  try{
    if(location.protocol==='file:'){
      // Generated from the JSON files; permits the original double-click preview.
      await loadScript('assets/data/dades-local.js');
    }else{
      async function json(path){const r=await fetch(path);if(!r.ok)throw new Error('Dades no disponibles: '+path);return r.json()}
      const [centres,entitats,archived]=await Promise.all([json('assets/data/centres.json'),json('assets/data/entitats.json'),json('assets/data/centres-arxivats.json')]);
      window.MAPA_DATA={centres,entitats,archived};
    }
    if(typeof L==='undefined')throw new Error('No s’ha pogut carregar el mapa. Comprova la connexió a Internet i recarrega la pàgina.');
    for(const file of ['perfil','mapes','infantil','candidatures','documents','ofertes','lleure','gmail','gmail-feed','navegacio','historial','candidatures-entitats','directoris','fonts']){
      await loadScript('assets/js/'+file+'.js');
    }
    window.MAPA_READY=true;
    document.dispatchEvent(new Event('mapa-ready'));
  }catch(error){
    console.error(error);
    const notice=document.createElement('div');notice.setAttribute('role','alert');
    notice.style.cssText='position:fixed;inset:80px 20px auto;z-index:30000;background:#fff4e5;padding:20px;border:1px solid #f5b942;border-radius:12px';
    notice.textContent=error.message;document.body.appendChild(notice);
  }
})();
