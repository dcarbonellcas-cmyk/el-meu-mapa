(() => {
  const sort = (a,b) => a.localeCompare(b,'ca',{sensitivity:'base',numeric:true});
  function hasSent(id){return state(id)==='sent'||hist(id).some(h=>h.type==='sent')}
  function tracking(x){
    const id=String(x.id),favorite=localStorage.getItem('favorite_'+id)==='true',last=hist(id).find(h=>h.type==='sent');
    const sent=hasSent(id),label=sent?'✓ CV enviat':'Sense enviaments registrats';
    return '<button type="button" class="smallBtn" data-favorite="'+esc(id)+'" aria-pressed="'+favorite+'" aria-label="Guardar '+esc(x.name)+' com a favorit">'+(favorite?'★ Favorit':'☆ Guardar')+'</button> '+(sent?'<button type="button" class="smallBtn" data-directory-id="'+esc(id)+'" style="background:#dcfce7;border-color:#86c99a;color:#166534;font-weight:800" aria-label="Veure enviaments de '+esc(x.name)+'" title="'+(last?'CV enviat el '+esc(fmt(last.date)):'Candidatura marcada com a enviada')+'">'+label+'</button>':'<small>'+label+'</small>');
  }
  const filter=document.createElement('select');
  filter.id='schoolDirectoryTracking';
  filter.className='smallBtn';
  filter.innerHTML='<option value="">Tots els llocs</option><option value="favorites">Només favorits</option><option value="new">Sense contactar</option><option value="sent">Ja contactats</option>';
  document.getElementById('schoolDirectorySearch').after(filter);
  filter.addEventListener('change',schoolsList);
  function matchesTracking(x){const f=filter.value;return f==='favorites'?localStorage.getItem('favorite_'+x.id)==='true':f==='new'?!hasSent(x.id):f==='sent'?hasSent(x.id):true}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-favorite]');if(!b)return;const key='favorite_'+b.dataset.favorite;localStorage.setItem(key,localStorage.getItem(key)==='true'?'false':'true');schoolsList()});
  document.addEventListener('candidature-history-changed',schoolsList);
  window.addEventListener('storage',schoolsList);
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
    const rows=schools.filter(x=>matchesTracking(x)&&(x.kind==='Privada'||x.kind==='Concertada')&&(!q||norm(x.name+' '+x.city).includes(q))).map(x=>({school:x,km:distance(x)})).sort((a,b)=>a.km-b.km||sort(a.school.name,b.school.name));
    document.getElementById('schoolDirectoryCount').textContent=rows.length+' escoles · de més a prop de Teià a més lluny · distància aproximada en línia recta';
    document.getElementById('schoolDirectoryList').innerHTML=rows.map(({school:x,km})=>`<div style="padding:10px 0;border-bottom:1px solid #e4e8f0"><button type="button" class="smallBtn" data-directory-id="${esc(x.id)}">${esc(x.name)}</button> <button type="button" class="smallBtn" data-directory-apply="${esc(x.id)}" ${x.email?'':'disabled title="Aquest centre no té correu al directori"'} aria-label="Preparar candidatura per a ${esc(x.name)}">✉ Preparar candidatura</button>${x.email?'':' <small>Correu no disponible</small>'}<div style="margin-top:8px">${tracking(x)}</div><div class="muted" style="margin-top:4px">${esc(x.city)} · ${esc(x.kind)} · ${Number.isFinite(km)?km.toLocaleString('ca-ES',{maximumFractionDigits:1})+' km de Teià':'Distància no disponible'}</div></div>`).join('')||'<p>No hi ha coincidències.</p>';
  }
  document.getElementById('schoolDirectorySearch').addEventListener('input',schoolsList);
  document.getElementById('schoolDirectory').addEventListener('toggle',e=>{if(e.target.open)schoolsList()});
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
  schoolsList();
})();
