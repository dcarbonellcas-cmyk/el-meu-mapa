(() => {
 const main=document.querySelector('#explorePage .mapwrap');if(!main)return;
 let stage='bressol',view='schools',query='',kind='nonpublic',limit=60;
 const labels={bressol:'Bressol · 0–3',infantil:'Infantil · 3–6',primaria:'Primària'};
 const roles={bressol:'infantil03',infantil:'infantil36',primaria:'primaria'};
 const entities=window.MAPA_DATA.entitats.infantil;
 const verifiedPortals=new Set(['xarxa_fep','xarxa_borsadocent','xarxa_manyanet','xarxa_betlem','xarxa_creixen','xarxa_meritxell','xarxa_nordanglia','xarxa_escolapies','xarxa_fecc','xarxa_fedac','xarxa_vedruna','xarxa_escolapia','xarxa_jesuites','xarxa_lasalle','xarxa_maristes','xarxa_salesians','gestora_cavall','gestora_suara','gestora_incoop','gestora_grupip','gestora_fundesplai','gestora_peretarres']);
 const networkIDs=new Set(entities.filter(x=>x.id.startsWith('xarxa_')).map(x=>x.id));
 const h=document.createElement('section');h.id='educationHub';h.className='educationHub';main.prepend(h);
 document.getElementById('schoolDirectory').hidden=true;
 document.querySelector('.infantDrop').hidden=true;
 document.getElementById('cards').hidden=true;
 const oldPortals=document.getElementById('jobPortals');if(oldPortals)oldPortals.hidden=true;
 const mapDrop=document.createElement('details');mapDrop.className='educationMap';mapDrop.id='educationSchoolMap';mapDrop.innerHTML='<summary>Veure els centres al mapa</summary>';
 const head=main.querySelector('.maphead'),box=main.querySelector('.mapbox');if(head&&box){head.before(mapDrop);mapDrop.append(head,box)}
 mapDrop.addEventListener('toggle',()=>{if(mapDrop.open&&window.map){map.invalidateSize();draw()}});
 const origin=[41.499,2.322];
 function distance(x){if(!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return Infinity;const r=v=>v*Math.PI/180,a=Math.sin(r(x.lat-origin[0])/2)**2+Math.cos(r(origin[0]))*Math.cos(r(x.lat))*Math.sin(r(x.lng-origin[1])/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)))}
 function stages(x){return x.stages||[...(x.age==='0-3'||x.age==='0-6'?['bressol']:[]),...(x.age==='3-6'||x.age==='0-6'?['infantil']:[])]}
 function rows(){return schools.filter(x=>stages(x).includes(stage)&&(kind==='all'||kind==='nonpublic'&&x.kind!=='Pública'||kind===x.kind)&&(!query||norm(x.name+' '+x.city+' '+(entities.find(g=>g.id===x.networkId)?.name||'')).includes(norm(query)))).sort((a,b)=>distance(a)-distance(b)||a.name.localeCompare(b.name,'ca'))}
 function link(url,text){return /^https?:\/\//.test(url||'')?'<a class="smallBtn" href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(text)+' ↗</a>':''}
 function bankLinks(g){return (g.applicationLinks||[]).map(x=>link(x.url,x.label)).join('')}
 function portalKey(id){return ({xarxa_fep:'xarxa_fecc',xarxa_manyanet:'xarxa_borsadocent'})[id]||id}
 function portalStatus(id){id=portalKey(id);try{return JSON.parse(localStorage.getItem('jobPortal_'+id)||'null')?.status||'pending'}catch{return 'pending'}}
 function statusSelect(id,name){const value=portalStatus(id);return '<label>Registre a la borsa (no és un enviament) <select class="smallBtn" data-education-status="'+esc(id)+'" aria-label="Inscripció a '+esc(name)+'">'+[['pending','Pendent'],['prepared','En preparació'],['registered','Compte o inscripció confirmats']].map(([v,t])=>'<option value="'+v+'"'+(v===value?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'}
 function schoolCard(x){const group=entities.find(e=>e.id===x.networkId),sent=hist(x.id).some(h=>h.type==='sent')||state(x.id)==='sent',km=distance(x);
 return '<article class="educationSchool"><div><h3>'+esc(x.name)+'</h3><p>'+esc(x.city)+' · '+esc(x.kind)+(Number.isFinite(km)?' · '+km.toLocaleString('ca',{maximumFractionDigits:1})+' km de Teià':'')+'</p><small>'+esc(group?group.name:'Xarxa o titularitat pendent de contrastar')+'</small>'+(sent?'<span class="educationSent">CV enviat</span>':'')+'</div><div class="educationActions">'+(x.email?'<button class="smallBtn" data-education-mail="'+esc(x.id)+'">Preparar correu</button>':'<small>Sense correu al directori</small>')+link(x.web,'Web del centre')+link(x.careers,'Candidatura al centre')+(group?link(group.careers,'Borsa de la xarxa'):'')+manualApplicationButton(x)+'<button class="smallBtn" data-education-detail="'+esc(x.id)+'">Dades i seguiment</button></div></article>'}
 function groupCard(g){const members=rows().filter(x=>x.networkId===g.id);const umbrella=g.id==='xarxa_fecc'||g.relationshipType==='job-board';return '<details class="educationGroup"><summary><strong>'+esc(g.name)+'</strong><span>'+(umbrella?'Borsa compartida d’escoles de titularitats diferents':members.length+' centres vinculats i comprovats per a aquesta etapa')+'</span></summary><div class="educationGroupBody"><p>'+esc(g.verified||g.services)+'</p><div class="educationActions">'+link(g.careers,g.id==='xarxa_fep'?'Candidatura general · Borsa FECC':verifiedPortals.has(g.id)?'Candidatura general · entrar a la borsa':'Web i contacte · borsa pendent de verificar')+bankLinks(g)+link(g.web,'Web de l’entitat')+'</div>'+statusSelect(g.id,g.name)+manualApplicationButton(g)+'<p class="muted">La inscripció general i les candidatures a cada oferta són tràmits diferents. Revisa les instruccions de la borsa abans de duplicar enviaments.</p>'+members.map(schoolCard).join('')+(!members.length?(umbrella?'<p>Aquesta és una borsa compartida, no la titular de totes les escoles. Consulta les ofertes del portal i la titularitat de cada centre.</p>':'<p>Encara no hi ha centres vinculats amb una font contrastada per a aquest filtre. Consulta el directori de la xarxa; això no vol dir que no tingui escoles.</p>'):'')+'</div></details>'}
 function syncMap(){window.educationStage=stage;document.querySelectorAll('[data-kind]').forEach(x=>x.checked=kind==='all'||kind==='nonpublic'&&x.dataset.kind!=='Pública'||kind===x.dataset.kind);document.getElementById('search').value=query;document.getElementById('county').value='';draw()}
 const views={schools:'Escoles',networks:'Fundacions i xarxes',portals:'Les meves borses'};
 const kinds={nonpublic:'Privades i concertades',Privada:'Privades',Concertada:'Concertades',all:'Tots els centres'};
 h.innerHTML='<header><p class="startEyebrow">LA TEVA CERCA DOCENT</p><h1>Educació</h1><p>Tria l’etapa i prepara la candidatura al centre o a la seva borsa de treball.</p></header>'+
   '<div class="educationToolbar" role="group" aria-label="Filtres d’Educació">'+
     '<div class="educationStages" role="group" aria-label="Etapa educativa">'+
       Object.entries(labels).map(([id,label])=>'<button type="button" class="smallBtn" data-education-stage="'+id+'">'+label+'</button>').join('')+
     '</div>'+
     '<div class="educationViews" role="group" aria-label="Tipus de cerca">'+
       Object.entries(views).map(([id,label])=>'<button type="button" class="smallBtn" data-education-view="'+id+'">'+label+'</button>').join('')+
     '</div>'+
     '<div class="educationTools">'+
       '<input id="educationQuery" class="search" type="search" placeholder="Escola, municipi o xarxa" aria-label="Cercar centres">'+
       '<select id="educationKind" class="smallBtn" aria-label="Tipus de centre">'+
         Object.entries(kinds).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+
       '</select>'+
     '</div>'+
   '</div><div class="educationContent"></div>';

 const content=h.querySelector('.educationContent');
 function addMapShortcut(before, fromOffers=false) {
   const callout=document.createElement('div');
   callout.className='alert alert-info schoolMapAlert';
   callout.innerHTML='<div><strong>Mapa de centres educatius</strong><p>Troba les escoles dels filtres d’Educació al mapa.</p></div>'+
     '<button type="button" class="btn btn-primary schoolMapButton" aria-controls="educationSchoolMap">Consultar el mapa <span aria-hidden="true">↓</span></button>';
   callout.querySelector('button').addEventListener('click',()=>{
     if(fromOffers) window.appShow('explore');
     mapDrop.open=true;
     mapDrop.querySelector('summary').focus({preventScroll:true});
     const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
     mapDrop.scrollIntoView({block:'start',behavior:reduceMotion?'instant':'smooth'});
   });
   before.before(callout);
 }
 if(mapDrop.isConnected) {
   addMapShortcut(content);
   const offersHeading=document.querySelector('#jobsPage .jobsHero');
   if(offersHeading) addMapShortcut(offersHeading,true);
 }

 const toolbarButtons=h.querySelectorAll('[data-education-stage], [data-education-view]');
 h.querySelector('#educationKind').addEventListener('change',e=>{kind=e.target.value;limit=60;syncMap();paint()});
 h.querySelector('#educationQuery').addEventListener('input',e=>{query=e.target.value;limit=60;syncMap();paint()});

 function paint(){
 const list=rows(),linked=schools.filter(x=>x.networkId).length;
 for(const button of toolbarButtons){
   const selected=button.dataset.educationStage===stage||button.dataset.educationView===view;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
 }
 content.innerHTML=(stage==='primaria'?'<p class="educationNotice">Per treballar de mestra de Primària cal complir els requisits del lloc. El teu grau continua en curs: les candidatures no el presenten com a acabat.</p>':'')+'<p class="muted">'+(view==='portals'?'Borses amb accés verificat. L’alta no equival a una candidatura enviada.':list.length+' centres d’aquesta etapa · distància aproximada en línia recta des de Teià.')+'</p><div id="educationResults">'+(view==='schools'?list.slice(0,limit).map(schoolCard).join('')+(list.length>limit?'<button class="smallBtn" data-education-more>Mostrar-ne més</button>':''):view==='networks'?entities.filter(g=>networkIDs.has(g.id)||g.id.startsWith('gestora_')).filter(g=>!query||norm(g.name).includes(norm(query))||list.some(x=>x.networkId===g.id)).map(groupCard).join(''):entities.filter(g=>verifiedPortals.has(g.id)&&g.careers&&(!query||norm(g.name).includes(norm(query)))).map(g=>'<article class="educationSchool '+(portalStatus(g.id)==='registered'?'educationPortalRegistered':'')+'"><div><h3>'+esc(g.name)+'</h3>'+statusSelect(g.id,g.name)+manualApplicationButton(g)+'</div><div class="educationActions">'+link(g.careers,'Entrar a la borsa')+bankLinks(g)+'</div></article>').join(''))+'</div><details class="educationCoverage"><summary>Cobertura i verificació del directori</summary><p>Centres d’Infantil i Primària del directori oficial del curs actual. No garanteix exhaustivitat en temps real. '+linked+' centres tenen una xarxa vinculada mitjançant una llista contrastada o el seu domini institucional. Els altres continuen pendents de revisió; no es consideren automàticament independents.</p><p>Els correus provenen del directori oficial. «Web del centre» no significa que s’hi hagi verificat una borsa pròpia. Les inscripcions, el perfil i els enviaments són privats i no es publiquen a GitHub. L’estat de les borses es desa en aquest navegador i se sincronitza quan connectes el mateix compte de Google a Documents.</p><a href="https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4" target="_blank" rel="noopener">Consultar el directori oficial</a></details>';
 }
 h.addEventListener('change',e=>{const s=e.target.closest('[data-education-status]');if(!s)return;const key=portalKey(s.dataset.educationStatus);localStorage.setItem('jobPortal_'+key,JSON.stringify({status:s.value,updated:new Date().toISOString()}));document.dispatchEvent(new Event('private-data-changed'))});
 h.addEventListener('click',e=>{const stageButton=e.target.closest('[data-education-stage]'),tab=e.target.closest('[data-education-view]'),mail=e.target.closest('[data-education-mail]'),detail=e.target.closest('[data-education-detail]');
 if(stageButton){stage=stageButton.dataset.educationStage;window.educationStage=stage;limit=60;syncMap();paint()}
 if(tab){view=tab.dataset.educationView;limit=60;paint()}
 if(e.target.closest('[data-education-more]')){limit+=60;paint()}
 if(mail){const x=schools.find(x=>String(x.id)===mail.dataset.educationMail);if(x)prepare({...x,applicationRole:roles[stage]})}
 if(detail){openSchool(detail.dataset.educationDetail);document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'start'})}
 });
 document.addEventListener('candidature-history-changed',paint);document.addEventListener('private-data-restored',paint);window.addEventListener('storage',paint);
 window.educationStage=stage;paint();draw();
})();
