(() => {
  const sort = (a,b) => a.localeCompare(b,'ca',{sensitivity:'base',numeric:true});
  function render(prefix, rows, query) {
    const list=document.getElementById(prefix+'List');
    const filteredRows=rows.filter(x=>!query||norm(x.name+' '+x.city).includes(query));
    const groups=new Map();
    for(const row of filteredRows){const city=row.city||'Localitat no indicada';if(!groups.has(city))groups.set(city,[]);groups.get(city).push(row)}
    document.getElementById(prefix+'Count').textContent=filteredRows.length+' noms · '+groups.size+' localitats o àmbits';
    list.innerHTML=[...groups].sort(([a],[b])=>sort(a,b)).map(([city,items])=>{
      const kinds=prefix==='schoolDirectory'?['Privada','Concertada']:['Entitats de lleure'];
      return `<details class="entityDrop"><summary>${esc(city)} · ${items.length}</summary>${kinds.map(kind=>{
        const selected=items.filter(x=>prefix!=='schoolDirectory'||x.kind===kind).sort((a,b)=>sort(a.name,b.name));
        if(!selected.length)return '';
        return `<details class="entityDrop"><summary>${esc(kind)} · ${selected.length}</summary><ul>${selected.map(x=>`<li><button type="button" class="smallBtn" data-directory-id="${esc(x.id)}">${esc(x.name)}</button>${prefix==='schoolDirectory'?` <small>${esc(x.age)}</small>`:''}</li>`).join('')}</ul></details>`;
      }).join('')}</details>`;
    }).join('')||'<p>No hi ha coincidències.</p>';
  }
  function schoolsList(){
    const valid=x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng);
    const originPoints=schools.filter(x=>norm(x.city)==='teia'&&valid(x));
    const origin=originPoints.length?[originPoints.reduce((n,x)=>n+x.lat,0)/originPoints.length,originPoints.reduce((n,x)=>n+x.lng,0)/originPoints.length]:null;
    function distance(x){
      if(!origin||!valid(x))return Infinity;
      const rad=v=>v*Math.PI/180;
      const dlat=rad(x.lat-origin[0]),dlng=rad(x.lng-origin[1]);
      const a=Math.sin(dlat/2)**2+Math.cos(rad(origin[0]))*Math.cos(rad(x.lat))*Math.sin(dlng/2)**2;
      return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
    }
    const q=norm(document.getElementById('schoolDirectorySearch').value);
    const rows=schools.filter(x=>(x.kind==='Privada'||x.kind==='Concertada')&&(!q||norm(x.name+' '+x.city).includes(q))).map(x=>({school:x,km:distance(x)})).sort((a,b)=>a.km-b.km||sort(a.school.name,b.school.name));
    document.getElementById('schoolDirectoryCount').textContent=rows.length+' escoles · de més a prop de Teià a més lluny · distància aproximada en línia recta';
    document.getElementById('schoolDirectoryList').innerHTML=rows.map(({school:x,km})=>`<div style="padding:10px 0;border-bottom:1px solid #e4e8f0"><button type="button" class="smallBtn" data-directory-id="${esc(x.id)}">${esc(x.name)}</button> <button type="button" class="smallBtn" data-directory-apply="${esc(x.id)}" ${x.email?'':'disabled title="Aquest centre no té correu al directori"'} aria-label="Preparar candidatura per a ${esc(x.name)}">✉ Preparar candidatura</button>${x.email?'':' <small>Correu no disponible</small>'}<div class="muted" style="margin-top:4px">${esc(x.city)} · ${esc(x.kind)} · ${Number.isFinite(km)?km.toLocaleString('ca-ES',{maximumFractionDigits:1})+' km de Teià':'Distància no disponible'}</div></div>`).join('')||'<p>No hi ha coincidències.</p>';
  }
  function leisureList(){
    const points=schools.filter(x=>norm(x.city)==='teia'&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
    const origin=points.length?[points.reduce((n,x)=>n+x.lat,0)/points.length,points.reduce((n,x)=>n+x.lng,0)/points.length]:null;
    const q=norm(document.getElementById('leisureDirectorySearch').value);
    const rows=LEISURE_ENTITIES.filter(x=>!q||norm(x.name+' '+x.city).includes(q)).map(x=>{
      const c=leisureCoords(x);let km=Infinity;
      if(c&&origin){const rad=v=>v*Math.PI/180;const a=Math.sin(rad(c[0]-origin[0])/2)**2+Math.cos(rad(origin[0]))*Math.cos(rad(c[0]))*Math.sin(rad(c[1]-origin[1])/2)**2;km=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)))}
      return {entity:x,km};
    }).sort((a,b)=>a.km-b.km||sort(a.entity.name,b.entity.name));
    document.getElementById('leisureDirectoryCount').textContent=rows.length+' llocs · proximitat aproximada a Teià segons la localitat';
    document.getElementById('leisureDirectoryList').innerHTML=rows.map(({entity:x,km})=>`<div style="padding:10px 0;border-bottom:1px solid #e4e8f0"><button type="button" class="smallBtn" data-directory-id="${esc(x.id)}">${esc(x.name)}</button> <button type="button" class="smallBtn" data-leisure-directory-apply="${esc(x.id)}" ${x.email?'':'disabled title="Correu no disponible"'} aria-label="Preparar candidatura per a ${esc(x.name)}">✉ Preparar candidatura</button><div class="muted" style="margin-top:4px">${esc(x.city)} · ${Number.isFinite(km)?km.toLocaleString('ca-ES',{maximumFractionDigits:1})+' km aproximats de Teià (localitat, en línia recta)':'Distància no disponible'}</div></div>`).join('')||'<p>No hi ha coincidències.</p>';
  }
  document.getElementById('schoolDirectorySearch').addEventListener('input',schoolsList);
  document.getElementById('leisureDirectorySearch').addEventListener('input',leisureList);
  document.getElementById('schoolDirectory').addEventListener('toggle',e=>{if(e.target.open)schoolsList()});
  document.getElementById('leisureDirectory').addEventListener('toggle',e=>{if(e.target.open)leisureList()});
  document.getElementById('schoolDirectoryList').addEventListener('click',e=>{
    const apply=e.target.closest('[data-directory-apply]');
    if(apply){const school=schools.find(x=>String(x.id)===apply.dataset.directoryApply);if(school)prepare(school);return;}
    const b=e.target.closest('[data-directory-id]');if(!b)return;
    const school=schools.find(x=>String(x.id)===b.dataset.directoryId);if(!school)return;
    document.getElementById('search').value='';document.getElementById('county').value='';
    document.querySelectorAll('[data-age]').forEach(x=>x.checked=true);
    document.querySelectorAll('[data-kind]').forEach(x=>x.checked=x.dataset.kind===school.kind);
    draw();openSchool(school.id);document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.getElementById('leisureDirectoryList').addEventListener('click',e=>{
    const apply=e.target.closest('[data-leisure-directory-apply]');if(apply){const x=LEISURE_ENTITIES.find(z=>String(z.id)===apply.dataset.leisureDirectoryApply);if(!x||!x.email)return;const last=hist(x.id).find(h=>h.type==='sent');if(last&&!confirm('Ja consta una candidatura enviada el '+fmt(last.date)+'. Vols preparar-ne una altra?'))return;localStorage.setItem('status_'+x.id,'prepared');addHist(x.id,'prepared','Candidatura de lleure preparada');showMailDraft(x,'Candidatura – Direcció / Coordinació de Lleure – '+candidateName(),leisureBody(x));return;}
    const b=e.target.closest('[data-directory-id]');if(!b)return;
    const entity=LEISURE_ENTITIES.find(x=>String(x.id)===b.dataset.directoryId);if(!entity)return;
    document.getElementById('leisureSearch').value=entity.name;document.getElementById('leisureStatus').value='';
    leisureFilter='all';document.querySelectorAll('.leisureFilter').forEach(x=>x.classList.toggle('active',x.dataset.lf==='all'));
    renderLeisure();document.getElementById('leisureGrid').scrollIntoView({behavior:'smooth',block:'start'});
  });
  schoolsList();leisureList();
})();
