(function(){
 const output=document.getElementById('dataUpdateDate'),button=document.getElementById('checkDataSources');
 const date=x=>x?new Date(x).toLocaleString('ca-ES'):'encara sense una consulta correcta';
 async function refresh(){try{
  const r=await fetch('assets/data/sincronitzacio.json',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json(),s=data.sources;
  const lines=['Actualització programada cada 6 hores, també amb la web tancada.'];
  const c=s.centres;if(c)lines.push('Centres: '+(c.count||'—')+' · curs '+(c.course||'—')+' · '+date(c.updatedAt)+(c.state==='error'?' · consulta fallida; còpia anterior':''));
  if(c?.concertCourse)lines.push('Concerts: darrera llista oficial publicada, curs '+c.concertCourse+'.');
  for(const [key,label] of [['feinaActiva','Feina Activa'],['sepe','SEPE']]){const x=s[key];if(x)lines.push(label+': '+(x.state==='ok'?(x.count+' ofertes · '+date(x.updatedAt)):'no s’ha pogut actualitzar · '+date(x.updatedAt)));}
  if(c?.archiveCount)lines.push(c.archiveCount+' centres no consten al directori actual d’infantil; no implica que hagin tancat. El seguiment es conserva.');
  lines.push('Gmail: '+(s.gmail?.state==='ok'?'alertes xifrades actualitzades · '+date(s.gmail.updatedAt):'pendent de completar la connexió privada amb Google.'));
  lines.push('Les 82 entitats sectorials continuen pendents de revisió. Cap font garanteix totes les ofertes de tots els portals.');
  output.style.whiteSpace='pre-line';output.textContent=lines.join('\n');
  if(Date.now()-Date.parse(data.checkedAt)>36*3600000)output.textContent+='\n⚠ L’actualització programada fa més de 36 hores que no publica dades. Cal revisar-la.';
 }catch{output.textContent='No s’ha pogut llegir l’estat de les actualitzacions.';}}
 button?.addEventListener('click',async()=>{button.disabled=true;await refresh();await window.__syncLiveJobSources?.();button.disabled=false;});
 refresh();setInterval(()=>{if(!document.hidden)refresh()},600000);
})();
