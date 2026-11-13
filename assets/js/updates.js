// Check publication versions only; never clear private browser storage.
(() => {
  const current=document.querySelector('meta[name="mapa-release"]')?.content;
  if(location.protocol==='file:')return;
  const panel=document.createElement('div');
  panel.className='app-update-controls';
  panel.style.cssText='display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0';
  const button=document.createElement('button');button.type='button';button.className='smallBtn';button.textContent='Actualitzar app';
  const status=document.createElement('span');status.setAttribute('role','status');
  status.textContent='Comprovació automàtica en tornar a obrir l’app.';
  panel.append(button,status);document.getElementById('homePage')?.append(panel);
  let last=0,busy=false,next='';
  function editing(){
    return Boolean(document.querySelector('dialog[open]'))||
      [...document.querySelectorAll('form')].some(form=>form.getClientRects().length>0)||
      ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||
      document.getElementById('mailDraftModal')?.style.display==='flex';
  }
  function refresh(version){
    const url=new URL(location.href);url.searchParams.set('app-update',version||Date.now());
    location.replace(url.href);
  }
  async function check(manual=false){
    if(busy||document.hidden||(!manual&&Date.now()-last<900000))return;
    if(next&&manual){if(!editing()||confirm('Hi ha un formulari obert. Vols recarregar l’app? Revisa abans els canvis que encara no hagis desat.'))refresh(next);return}
    last=Date.now();busy=true;button.disabled=true;
    if(manual)status.textContent='Comprovant la versió publicada…';
    try{
      const response=await fetch('app-version.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error('version_unavailable');
      const data=await response.json();if(!/^[a-f0-9]{16}$/.test(data.version))throw Error('invalid_version');
      if(data.version!==current){
        next=data.version;
        if(!editing()&&(manual||document.getElementById('homePage')?.style.display!=='none'))return refresh(next);
        status.textContent='Hi ha una versió nova. Acaba el que estàs fent i prem Actualitzar app a Inici.';
      }else if(manual){
        if(editing()){status.textContent='Ja tens la darrera versió. Acaba el formulari abans de recarregar les dades.';return}
        refresh(data.version);
      }
    }catch{if(manual)status.textContent='No s’ha pogut comprovar la versió. Revisa Internet i torna-ho a provar. Les dades es conserven.'}
    finally{busy=false;button.disabled=false}
  }
  button.addEventListener('click',()=>check(true));
  document.addEventListener('visibilitychange',()=>check());
  window.addEventListener('pageshow',()=>check());
  setInterval(()=>check(),900000);
})();
