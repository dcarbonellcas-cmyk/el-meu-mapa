// Personal portal records use the existing private jobPortal_ namespace.
function validatePortalImport(rows){
  if(!Array.isArray(rows)||rows.length>300)throw Error('La llista de borses no és vàlida.');
  const ids=new Set();
  for(const row of rows){
    if(!row||typeof row.id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(row.id)||ids.has(row.id)||
      typeof row.name!=='string'||!row.name.trim()||row.name.length>500||
      !['pending','prepared','registered'].includes(row.status)||typeof row.note!=='string'||row.note.length>10000||
      typeof row.url!=='string'||!/^https?:\/\//.test(row.url)||!Number.isFinite(Date.parse(row.reviewedAt)))throw Error('Hi ha una borsa amb dades no vàlides. No s’ha importat la llista.');
    const url=new URL(row.url);if(url.username||url.password)throw Error('L’enllaç no pot contenir credencials.');
    if(row.evidence&&(!/^https:\/\//.test(row.evidence)||row.evidence.length>2000))throw Error('El comprovant no és vàlid.');
    ids.add(row.id);
  }
  return rows;
}
function importPrivatePortals(storage,rows){
  validatePortalImport(rows); // Validate the entire file before changing anything.
  for(const row of rows){
    const key='jobPortal_'+row.id;
    let previous=null;try{previous=JSON.parse(storage.getItem(key)||'null')}catch{}
    // Keep explicit later user changes when importing the same evidence again.
    const newer=Number.isFinite(Date.parse(previous?.updated))&&Date.parse(previous.updated)>Date.parse(row.reviewedAt);
    const merged={...previous,...row,status:newer?previous.status:row.status,updated:newer?previous.updated:row.reviewedAt};
    storage.setItem(key,JSON.stringify(merged));
  }
}
function privatePortalRows(storage){
  const rows=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);if(!key.startsWith('jobPortal_'))continue;
    try{const row=JSON.parse(storage.getItem(key));if(row?.name&&/^https?:\/\//.test(row.url))rows.push({...row,id:key.slice(10)})}catch{}
  }
  return rows.sort((a,b)=>a.name.localeCompare(b.name,'ca'));
}

(() => {
  const page=document.getElementById('portalsPage'),list=document.getElementById('portalList'),notice=document.getElementById('portalNotice');
  const tabs=[...page.querySelectorAll('[data-portal-view]')];
  let view='registered';
  const link=(url,text)=>{const a=document.createElement('a');a.href=url;a.textContent=text;a.target='_blank';a.rel='noopener noreferrer';return a};
  function render(){
    const rows=privatePortalRows(localStorage),query=document.getElementById('portalSearch').value.trim().toLocaleLowerCase('ca');
    for(const tab of tabs){const registered=tab.dataset.portalView==='registered';tab.setAttribute('aria-pressed',String(tab.dataset.portalView===view));tab.textContent=(registered?'Borses inscrites':'Borses pendents')+' ('+rows.filter(r=>(r.status==='registered')===registered).length+')';}
    const visible=rows.filter(row=>(row.status==='registered')===(view==='registered')&&(!query||(row.name+' '+row.note).toLocaleLowerCase('ca').includes(query)));
    list.replaceChildren();
    for(const row of visible){
      const card=document.createElement('li');card.className='portalCard';
      const label=document.createElement('label');label.className='portalCheck';
      const box=document.createElement('input');box.type='checkbox';box.checked=row.status==='registered';box.setAttribute('aria-label','Inscripció completada a '+row.name);
      label.append(box);card.append(label);
      const body=document.createElement('div'),heading=document.createElement('h2');heading.textContent=row.name;
      const note=document.createElement('p');note.textContent=row.note;
      const actions=document.createElement('div');actions.className='portalActions';actions.append(link(row.url,row.linkLabel||'Obrir borsa de treball'));
      if(row.evidence)actions.append(link(row.evidence,'Veure comprovant o resposta'));
      body.append(heading,note,actions);card.append(body);list.append(card);
      box.addEventListener('change',()=>{
        const current=JSON.parse(localStorage.getItem('jobPortal_'+row.id)||'{}');
        localStorage.setItem('jobPortal_'+row.id,JSON.stringify({...current,status:box.checked?'registered':'pending',updated:new Date().toISOString()}));
        document.dispatchEvent(new Event('private-data-changed'));render();
        notice.textContent=row.name+(box.checked?' desada a Borses inscrites.':' desada a Borses pendents.');
        tabs.find(tab=>tab.dataset.portalView===view)?.focus();
      });
    }
    document.getElementById('portalEmpty').hidden=visible.length>0;
    document.getElementById('portalEmpty').textContent=rows.length?'No hi ha borses en aquesta vista amb aquests filtres.':'Encara no s’ha recuperat la llista privada. Connecta Google a Documents o importa la teva llista.';
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>{view=tab.dataset.portalView;render()}));
  document.getElementById('portalSearch').addEventListener('input',render);
  document.getElementById('portalImport').addEventListener('change',async event=>{
    try{const file=event.target.files[0];if(!file)return;if(file.size>2000000)throw Error('El fitxer és massa gran.');
      importPrivatePortals(localStorage,JSON.parse(await file.text()));
      document.dispatchEvent(new Event('private-data-changed'));render();notice.textContent='Llista privada importada. Les marques es desen en aquest navegador i se sincronitzen quan connectes Google.';
    }catch(error){notice.textContent=error.message}finally{event.target.value=''}
  });
  document.addEventListener('private-data-restored',render);
  document.addEventListener('private-data-changed',render);
  window.addEventListener('storage',render);
  window.renderPrivatePortals=render;
  render();
})();
