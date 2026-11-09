const LEISURE_ENTITIES=window.MAPA_DATA.entitats.lleure;
window.LEISURE_ENTITIES=LEISURE_ENTITIES;
function leisureState(id){return localStorage.getItem('status_'+id)||'none'}
function leisureEsc(x){return String(x||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function leisureBody(x){return `Bon dia,

Em dic ${candidateName()} i em poso en contacte amb vosaltres per fer-vos arribar la meva candidatura per formar part del vostre equip de lleure educatiu.

Tinc especial interès en oportunitats de direcció i coordinació de lleure, coordinació d’equips i serveis educatius, i també estic oberta a posicions de monitoratge, menjador, extraescolars, casals i acollida.

${candidateBio()}

Resto a la vostra disposició per ampliar qualsevol informació o mantenir una entrevista.

Moltes gràcies pel vostre temps.

Atentament,
${candidateName()}`}
const leisureMapDisclosure=document.getElementById('leisureMapDisclosure');
let leisureFilter='all', leisureMapObj=null, leisureLayer=null;
function leisureCoords(x){const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,"'").trim();const city=norm(x.city);const pts=schools.filter(s=>norm(s.city)===city&&Number.isFinite(s.lat)&&Number.isFinite(s.lng));if(pts.length){return [pts.reduce((a,b)=>a+b.lat,0)/pts.length,pts.reduce((a,b)=>a+b.lng,0)/pts.length]}const fallback={'barcelona':[41.3874,2.1686],'figueres':[42.2675,2.9616],'girona':[41.9794,2.8214],'salt':[41.9742,2.7928]};return fallback[city]||null}
function leisureMatchFilter(x){const t=(x.services+' '+x.name).toLowerCase();if(leisureFilter==='all')return true;if(leisureFilter==='coord')return /direcci|coordin|gesti/.test(t);if(leisureFilter==='monitor')return /monitor|lleure|educatiu/.test(t);if(leisureFilter==='migdia')return /menjador|migdia|cuina/.test(t);if(leisureFilter==='extra')return /extraescolar/.test(t);if(leisureFilter==='casal')return /casal|lleure/.test(t);if(leisureFilter==='acollida')return /acollida/.test(t);return true}
function leisureVisible(){const q=norm(document.getElementById('leisureSearch').value.trim()),st=document.getElementById('leisureStatus')?.value||'';return LEISURE_ENTITIES.filter(x=>(!q||norm([x.name,x.city,x.services].join(' ')).includes(q))&&(!st||leisureState(x.id)===st)&&leisureMatchFilter(x))}
function ensureLeisureMap(){
  const el=document.getElementById('leisureMap');
  if(!el)return false;
  if(typeof L==='undefined'){el.innerHTML='<div style="padding:28px;color:#61718d">Carregant el mapa de carrers…</div>';setTimeout(()=>{if(typeof L!=='undefined')window.__renderLeisure&&window.__renderLeisure()},800);return false}
  if(leisureMapObj)return true;
  try{
    if(el._leaflet_id){el._leaflet_id=null;el.innerHTML=''}
    leisureMapObj=L.map(el,{preferCanvas:true,zoomControl:true}).setView([41.75,1.75],8);
    const baseTiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{subdomains:'abc',maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(leisureMapObj);let tileErrors=0;baseTiles.on('tileerror',()=>{tileErrors++;if(tileErrors===4){try{leisureMapObj.removeLayer(baseTiles);L.tileLayer('https://tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',{maxZoom:20,attribution:'&copy; OpenStreetMap contributors'}).addTo(leisureMapObj)}catch(e){}}});
    leisureLayer=L.layerGroup().addTo(leisureMapObj);
    setTimeout(()=>leisureMapObj.invalidateSize(true),120);
    return true;
  }catch(err){console.error('Mapa lleure:',err);el.innerHTML='<div style="padding:28px;color:#9a3412">No s’ha pogut iniciar el mapa. Recarrega la pàgina.</div>';return false}
}
function drawLeisureMap(a){
  if(!leisureMapDisclosure.open||!leisureMapDisclosure.getClientRects().length||!ensureLeisureMap())return;
  leisureLayer.clearLayers();const bounds=[];
  a.forEach(x=>{const c=leisureCoords(x);if(!c)return;bounds.push(c);const sent=leisureState(x.id)==='sent';const marker=L.circleMarker(c,{radius:8,weight:2,color:sent?'#15803d':'#b7791f',fillColor:sent?'#22c55e':'#f6c453',fillOpacity:.9});marker.bindPopup(`<b>${leisureEsc(x.name)}</b><br>${leisureEsc(x.city)}<br><small>${leisureEsc(x.services)}</small>`);marker.addTo(leisureLayer)});
  document.getElementById('leisureCount').textContent=bounds.length;
  requestAnimationFrame(()=>{if(!leisureMapDisclosure.open)return;leisureMapObj.invalidateSize(true);if(bounds.length>1)leisureMapObj.fitBounds(bounds,{padding:[25,25],maxZoom:11});else if(bounds.length===1)leisureMapObj.setView(bounds[0],11)});
}
function acellecCard(){
  const query=norm(document.getElementById('leisureSearch').value.trim());
  if(document.getElementById('leisureStatus').value||!norm('ACELLEC Associació Catalana d’Empreses del Lleure Educació Cultura borsa de treball').includes(query))return '';
  return `<article class="leisureCard">
    <div class="jobMeta">Associació sectorial · Catalunya</div>
    <h3>ACELLEC</h3>
    <p>Ofertes de feina i borsa de currículums de les empreses associades.</p>
    <div class="leisureActions">
      <a class="jobBtn primaryJob" href="https://acellec.cat/ofertes.php" target="_blank" rel="noopener">Veure ofertes</a>
      <a class="jobBtn" href="https://acellec.cat/form_borsa.php" target="_blank" rel="noopener">Borsa de CV</a>
      <a class="jobBtn" href="https://acellec.cat/llistat.php" target="_blank" rel="noopener">Empreses associades</a>
    </div>
  </article>`;
}
function renderLeisure(){const g=document.getElementById('leisureGrid');if(!g)return;const a=leisureVisible();g.innerHTML=(acellecCard()+a.map(x=>`<article class="leisureCard"><div style="display:flex;justify-content:space-between;gap:8px"><div><div class="jobMeta">${leisureEsc(x.city)}</div><h3>${leisureEsc(x.name)}</h3></div>${leisureState(x.id)==='sent'?'<span class="leisurePriority">✓ CV enviat</span>':''}</div><div class="jobMeta">${leisureEsc(x.services)}</div><div style="margin-top:10px;font-size:13px"><b>✉</b> ${x.email?leisureEsc(x.email):'<span class="jobMeta">consulta web/empresa</span>'}<br><b>☎</b> ${leisureEsc(x.phone||'—')}</div><div class="leisureActions"><button class="jobBtn primaryJob" data-leisure-send="${x.id}" ${x.email?'':'title="Cal completar el correu de contacte"'}>✉ Preparar candidatura</button>${manualApplicationButton(x)}<button class="jobBtn" data-leisure-sent="${x.id}">✓ Ja enviada</button></div>${hist(x.id).length?`<div class="jobMeta" style="margin-top:9px">Últim contacte: ${fmt(hist(x.id)[0].date)}</div>`:''}</article>`).join(''))||'<p>No hi ha empreses o entitats que coincideixin amb els filtres.</p>';drawLeisureMap(a)}
window.__renderLeisure=renderLeisure;
leisureMapDisclosure.addEventListener('toggle',()=>drawLeisureMap(leisureVisible()));
document.addEventListener('candidature-history-changed',()=>{if(leisureMapDisclosure.getClientRects().length)renderLeisure()});
document.addEventListener('private-data-restored',()=>{if(leisureMapDisclosure.getClientRects().length)renderLeisure()});
document.getElementById('leisureSearch')?.addEventListener('input',renderLeisure);document.getElementById('leisureStatus')?.addEventListener('change',renderLeisure);document.querySelectorAll('.leisureFilter').forEach(b=>b.addEventListener('click',()=>{leisureFilter=b.dataset.lf;document.querySelectorAll('.leisureFilter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});renderLeisure()}));
document.getElementById('leisureGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-leisure-send]');if(b){const x=LEISURE_ENTITIES.find(z=>z.id===b.dataset.leisureSend);if(!x)return;const last=hist(x.id).find(h=>h.type==='sent');if(last&&!confirm('⚠️ Ja consta una candidatura enviada el '+fmt(last.date)+'. Vols preparar-ne una altra?'))return;localStorage.setItem('status_'+x.id,'prepared');addHist(x.id,'prepared','Candidatura de lleure preparada');showMailDraft(x,'Candidatura – Direcció / Coordinació de Lleure – '+candidateName(),leisureBody(x));return}const m=e.target.closest('[data-leisure-sent]');if(m){const x=LEISURE_ENTITIES.find(z=>z.id===m.dataset.leisureSent);if(x){localStorage.setItem('status_'+x.id,'sent');addHist(x.id,'sent','Candidatura de lleure marcada com enviada');renderLeisure()}}});
