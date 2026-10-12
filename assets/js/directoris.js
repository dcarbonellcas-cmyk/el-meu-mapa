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
  function schoolsList(){render('schoolDirectory',schools.filter(x=>x.kind==='Privada'||x.kind==='Concertada'),norm(document.getElementById('schoolDirectorySearch').value))}
  function leisureList(){render('leisureDirectory',LEISURE_ENTITIES,norm(document.getElementById('leisureDirectorySearch').value))}
  document.getElementById('schoolDirectorySearch').addEventListener('input',schoolsList);
  document.getElementById('leisureDirectorySearch').addEventListener('input',leisureList);
  document.getElementById('schoolDirectory').addEventListener('toggle',e=>{if(e.target.open)schoolsList()});
  document.getElementById('leisureDirectory').addEventListener('toggle',e=>{if(e.target.open)leisureList()});
  document.getElementById('schoolDirectoryList').addEventListener('click',e=>{
    const b=e.target.closest('[data-directory-id]');if(!b)return;
    const school=schools.find(x=>String(x.id)===b.dataset.directoryId);if(!school)return;
    document.getElementById('search').value='';document.getElementById('county').value='';
    document.querySelectorAll('[data-age]').forEach(x=>x.checked=true);
    document.querySelectorAll('[data-kind]').forEach(x=>x.checked=x.dataset.kind===school.kind);
    draw();openSchool(school.id);document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.getElementById('leisureDirectoryList').addEventListener('click',e=>{
    const b=e.target.closest('[data-directory-id]');if(!b)return;
    const entity=LEISURE_ENTITIES.find(x=>String(x.id)===b.dataset.directoryId);if(!entity)return;
    document.getElementById('leisureSearch').value=entity.name;document.getElementById('leisureStatus').value='';
    leisureFilter='all';document.querySelectorAll('.leisureFilter').forEach(x=>x.classList.toggle('active',x.dataset.lf==='all'));
    renderLeisure();document.getElementById('leisureGrid').scrollIntoView({behavior:'smooth',block:'start'});
  });
  schoolsList();leisureList();
})();
