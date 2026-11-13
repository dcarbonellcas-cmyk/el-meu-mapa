(() => {
 const main=document.querySelector('#explorePage .mapwrap');if(!main)return;
 let stage='bressol',view='schools',query='',kind='all',trackingFilter='all';
 const pageSize=20;
 function resetTrackingPages(){for(const key of Object.keys(trackingPages))trackingPages[key]=1}
 const trackingPages={all:1,unsent:1,sent:1,renew:1};
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
 const mapDrop=document.createElement('details');mapDrop.className='educationMap';mapDrop.id='educationSchoolMap';mapDrop.hidden=true;mapDrop.innerHTML='<summary hidden>Mapa de centres educatius</summary>';
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
 const profiles={
   '8060034':{
     description:'A Bambi, els infants aprenen jugant i experimentant amb objectes de cada dia. Els racons serveixen per representar situacions familiars, i els contes i titelles donen peu a practicar el llenguatge oral. El centre també proposa activitats de ritme i moviment.',
     source:'https://llardinfantsbambi.com/que-fem/',
     web:'https://llardinfantsbambi.com/el-masnou/'
   },
   '8056900':{
     description:'Chiaravalle School Maresme és una escola infantil Montessori d’Alella. Organitza els espais i els materials segons l’etapa perquè els infants puguin explorar i guanyar autonomia al seu ritme.',
     source:'https://www.chiaravalleschool.es/la-escuela/',
     web:'https://www.chiaravalleschool.es/la-escuela/'
   },
   '8058179':{
     description:'El Petit Vailet planteja una educació activa des de l’etapa bressol. Incorpora l’anglès amb sessions setmanals de Kids&Us i apropa els infants als sons d’altres llengües amb cançons i jocs.',
     source:'https://petitvailet.com/',
     web:'https://petitvailet.com/'
   },
   '8022719':{
     description:'Aquesta escola de Parets combina projectes, racons i tallers amb activitats en equip. El projecte educatiu preveu adaptar les propostes al ritme de cada alumne i fer un seguiment continu per detectar dificultats mentre aprèn.',
     source:'https://nsmontserrat.com/wp-content/uploads/2025/11/PEC-r.-25-26-1-1.pdf',
     web:'https://nsmontserrat.com/'
   },
   '8062547':{
     description:'Peques és una escola bressol privada de Mataró per a infants de 0 a 3 anys. Hi ha constància d’un projecte d’art iniciat el 2013 amb el grup de dos anys. La metodologia actual del centre està pendent de contrastar.',
     source:'https://premisrecerca.uvic.cat/sites/default/files/webform/22d6431784edb59b7aef5c3f67ce191d8101beb8_UVIC%20TREBALL%20RECERCA.pdf',
     web:''
   },
   '8040001':{
     description:'Escola concertada del Masnou que ofereix Infantil, Primària i ESO. El centre explica que combina l’aprenentatge per ambients i per projectes amb un seguiment personalitzat de l’alumnat.',
     source:'https://www.escolaberganti.org/',
     web:'https://www.escolaberganti.org/'
   },
   '8020772':{
     description:'Centre concertat de la Fundació Escolàpies al Masnou. A Infantil prioritza el desenvolupament durant els primers anys. A Primària treballa l’educació en valors i les competències de l’etapa.',
     source:'https://escolapieselmasnou.org/',
     web:'https://escolapieselmasnou.org/'
   },
   '8050193':{
     description:'Ca la Rita és una escola bressol familiar del Masnou. El projecte que l’equip explicava el 2017 partia de situacions que els infants poden viure i explorar de primera mà. Les educadores preparaven activitats i materials perquè els infants descobrissin coses fent-les, i buscaven la complicitat de les famílies en el dia a dia.',
     source:'https://www.elmasnou.cat/media/repository/import/documents/documents/elmasnouviu/VIU96.pdf',
     web:''
   },
   '8063655':{
     description:'Seu d’Escoles Betlem a Premià de Dalt que ofereix educació maternal i infantil. A Maternal fan servir el joc per treballar la comunicació i l’aprenentatge, i incorporen la psicomotricitat.',
     source:'https://escolesbetlem.com/ca/educacio-maternal/',
     web:'https://escolesbetlem.com/ca/'
   },
   '8036986':{
     description:'Seu d’Escoles Betlem de la carretera del Ramal, a Premià de Dalt. El web hi situa Primària, ESO i Batxillerat. El projecte educatiu del grup dona importància al respecte i a la responsabilitat.',
     source:'https://escolesbetlem.com/ca/',
     web:'https://escolesbetlem.com/ca/'
   }
 };
 function schoolDescription(x){
   const names={bressol:'educació infantil de 0 a 3 anys',infantil:'educació infantil de 3 a 6 anys',primaria:'educació primària'};
   const levels=stages(x).map(level=>names[level]).filter(Boolean);
   const location=[x.city,x.county].filter(Boolean).join(' · ');
   const stageText=levels.length?'Ofereix '+new Intl.ListFormat('ca').format(levels)+'.':'';
   return [x.kind?'Escola '+x.kind.toLowerCase()+'.':'Centre educatiu.',location?location+'.':'',
     stageText,'La metodologia del centre està pendent de contrastar.'].filter(Boolean).join(' ');
 }
 function schoolCard(x){
   const group=entities.find(e=>e.id===x.networkId);
   const sent=hist(x.id).some(h=>h.type==='sent')||state(x.id)==='sent';
   const km=distance(x), id=esc(x.id), name=esc(x.name);
   return `<article class="educationSchool">
     <h3><button type="button" class="educationSchoolName" data-education-profile="${id}">${name}</button></h3>
     <p>${esc(x.city)} · ${esc(x.kind)}${Number.isFinite(km)?' · '+km.toLocaleString('ca',{maximumFractionDigits:1})+' km de Teià':''}</p>
     <small>${esc(group?group.name:'Xarxa o titularitat pendent de contrastar')}</small>
     ${sent?'<span class="educationSent">CV enviat</span>':''}
     <small class="educationFollowUp">${esc(trackingForPlace(x).reason)}</small>
     <div class="educationActions educationSchoolActions">
       ${x.email?`<button type="button" class="smallBtn" data-education-mail="${id}">Preparar correu</button>`:'<small>Sense correu al directori</small>'}
       ${manualApplicationButton(x)}
       <button type="button" class="smallBtn schoolLocationIcon" title="Obrir el mini mapa" data-education-location="${id}" aria-label="Veure ${name} al mapa"> <svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden="true"><path d="M16 29S5 19 5 12a11 11 0 0 1 22 0c0 7-11 17-11 17Z" stroke="currentColor" stroke-width="2"/><path d="m10 12 6-4 6 4v8H10v-8Z" stroke="currentColor" stroke-width="1.5"/><path d="M14 20v-5h4v5M16 5v3" stroke="currentColor" stroke-width="1.5"/></svg></button>
     </div>
   </article>`;
 }

 const schoolDialog=document.createElement('dialog');
 schoolDialog.className='educationSchoolDialog';
 schoolDialog.setAttribute('aria-labelledby','educationSchoolTitle');
 schoolDialog.innerHTML='<header class="educationSchoolDialogHeader">'+
   '<form method="dialog"><button class="smallBtn">Tancar</button></form>'+
   '<h2 id="educationSchoolTitle"></h2><p class="educationSchoolAddress" hidden></p></header>'+
   '<div class="educationSchoolInfo"></div><div class="mapbox educationSchoolMiniMap" hidden><div class="schoolMapCanvas"></div></div>';
 document.body.append(schoolDialog);
 const info=schoolDialog.querySelector('.educationSchoolInfo');
 const locationAddress=schoolDialog.querySelector('.educationSchoolAddress');
 const miniMapHost=schoolDialog.querySelector('.educationSchoolMiniMap');
 const miniMapCanvas=miniMapHost.querySelector('.schoolMapCanvas');
 let miniMap;
 schoolDialog.addEventListener('close',()=>{
   miniMap?.remove();
   miniMap=undefined;
   miniMapHost.hidden=true;
 });

 function showSchool(x){
   schoolDialog.classList.remove('educationMiniMapDialog');
   locationAddress.hidden=true;
   info.hidden=false;
   const profile=profiles[x.id]||{};
   const group=entities.find(e=>e.id===x.networkId);
   const address=[x.address,[x.postal,x.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
   const links=[link(profile.web??x.web,'Web del centre'),link(x.careers,'Candidatura al centre'),
     group?.careers!==x.careers?link(group?.careers,'Borsa de la xarxa'):''].join('');
   schoolDialog.querySelector('h2').textContent=x.name;
   info.innerHTML=`<p>${esc(profile.description||schoolDescription(x))}</p>
     ${address?`<p class="muted">${esc(address)}</p>`:''}
     ${links?`<div class="educationActions">${links}</div>`:''}`;
   schoolDialog.showModal();
 }

 function showSchoolOnMap(school){
   const address=[school.address,school.city].filter(Boolean).join(' · ');
   schoolDialog.querySelector('h2').textContent=school.name;
   const hasPoint=Number.isFinite(school.lat)&&Number.isFinite(school.lng);
   schoolDialog.classList.add('educationMiniMapDialog');
   locationAddress.textContent=address;
   locationAddress.hidden=!address;
   info.textContent=hasPoint?'':'El directori no indica les coordenades del centre.';
   info.hidden=hasPoint;
   miniMapHost.hidden=!hasPoint;
   schoolDialog.showModal();
   if(!hasPoint)return;
   miniMap?.remove();
   miniMap=createSchoolMap(miniMapCanvas,[school.lat,school.lng],17);
   requestAnimationFrame(()=>miniMap?.invalidateSize());
   createSchoolMarker(school).addTo(miniMap);
 }
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
 function showEducationMap(){
   window.closeEducationRegistrations?.();
   mapDrop.hidden=false;mapDrop.open=true;
   document.getElementById('educationMapToggle')?.setAttribute('aria-expanded','true');
   mapDrop.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }

 function addMapShortcut(before, fromOffers=false) {
   const callout=document.createElement('div');
   callout.className='alert alert-info schoolMapAlert';
   callout.innerHTML='<div><strong>Mapa de centres educatius</strong><p>Troba les escoles dels filtres d’Educació al mapa.</p></div>'+
     '<button type="button" class="btn btn-primary schoolMapButton" aria-controls="educationSchoolMap">Consultar el mapa <span aria-hidden="true">↓</span></button>';
   callout.querySelector('button').addEventListener('click',()=>{
     if(fromOffers) window.appShow('explore');
     showEducationMap();
   });
   before.before(callout);
 }
 if(mapDrop.isConnected) {
   const privatePortals=document.createElement('section');privatePortals.id='educationPrivatePortals';privatePortals.className='educationPrivatePortals';
   privatePortals.setAttribute('aria-label','Inscripcions a webs');
   const portalPage=document.getElementById('portalsPage');portalPage.hidden=true;
   portalPage.querySelector('header').hidden=true;
   const registrationBar=document.createElement('div');registrationBar.className='educationRegistrationBar';
   const registrationTabs=portalPage.querySelector('.portalTabs');registrationTabs.classList.add('educationStages');
   registrationBar.append(registrationTabs);privatePortals.append(registrationBar,portalPage);
   content.before(privatePortals,mapDrop);
   const mapToggle=document.createElement('button');mapToggle.id='educationMapToggle';mapToggle.type='button';mapToggle.className='smallBtn';mapToggle.textContent='⌖ Mapa de centres';mapToggle.setAttribute('aria-expanded','false');mapToggle.setAttribute('aria-controls','educationSchoolMap');
   registrationBar.append(mapToggle);
   mapToggle.addEventListener('click',()=>{if(mapDrop.hidden)showEducationMap();else{mapDrop.hidden=true;mapDrop.open=false;mapToggle.setAttribute('aria-expanded','false')}});
   const offersHeading=document.querySelector('#jobsPage .jobsHero');
   if(offersHeading) addMapShortcut(offersHeading,true);
 }

 h.querySelector('#educationKind').value=kind;
 document.addEventListener('education-registration-view',event=>{content.hidden=event.detail.open;if(event.detail.open){mapDrop.hidden=true;mapDrop.open=false;document.getElementById('educationMapToggle')?.setAttribute('aria-expanded','false')}});
 const toolbarButtons=h.querySelectorAll('[data-education-stage], [data-education-view]');
 h.querySelector('#educationKind').addEventListener('change',e=>{kind=e.target.value;resetTrackingPages();syncMap();paint()});
 h.querySelector('#educationQuery').addEventListener('input',e=>{query=e.target.value;resetTrackingPages();syncMap();paint()});

 function schoolResults(list,bucket){
   const currentPage=Math.min(trackingPages[bucket]||1,Math.max(1,Math.ceil(list.length/pageSize)));
   const pages=Math.ceil(list.length/pageSize);
   const start=(currentPage-1)*pageSize;
   const cards=list.slice(start,start+pageSize).map(schoolCard).join('');
   if(pages<=1)return cards;
   const nearby=Array.from({length:5},(_,index)=>currentPage+index-2).filter(n=>n>1&&n<pages);
   const numbers=[1,...nearby,pages];
   const controls=numbers.map((n,index)=>
     (index&&n-numbers[index-1]>1?'<span aria-hidden="true">…</span>':'')+
     `<button type="button" class="smallBtn" data-education-page="${n}" data-education-bucket="${bucket}" aria-label="Pàgina ${n}"${n===currentPage?' aria-current="page"':''}>${n}</button>`
   ).join('');
   return cards+`<nav class="educationPagination" aria-label="Pàgines d’escoles">${controls}</nav>`;
 }

 function paint(){
 const list=rows(),linked=schools.filter(x=>x.networkId).length;
 for(const button of toolbarButtons){
   const selected=button.dataset.educationStage===stage||button.dataset.educationView===view;
   button.classList.toggle('selected',selected);
   button.setAttribute('aria-pressed',String(selected));
 }
 const uniquePortals=new Map(entities.filter(g=>verifiedPortals.has(g.id)&&g.careers).map(g=>[portalKey(g.id),{...g,id:portalKey(g.id)}]));
 if(typeof privatePortalRows==='function')for(const row of privatePortalRows(localStorage))uniquePortals.set(row.id,{...uniquePortals.get(row.id),...row,careers:row.url,web:row.url});
 const candidates=view==='schools'?list:(view==='networks'?entities.filter(g=>networkIDs.has(g.id)||g.id.startsWith('gestora_')):[...uniquePortals.values()]).filter(g=>!query||norm(g.name).includes(norm(query))||list.some(x=>x.networkId===g.id));
 const buckets={unsent:[],sent:[],renew:[]};
 for(const place of candidates)buckets[trackingForPlace(place).bucket].push(place);
 const portalCard=g=>'<article class="educationSchool '+(portalStatus(g.id)==='registered'?'educationPortalRegistered':'')+'"><div><h3>'+esc(g.name)+'</h3>'+statusSelect(g.id,g.name)+manualApplicationButton(g)+'<p>'+esc(trackingForPlace(g).reason||'No consta un enviament amb data confirmada.')+'</p>'+(g.note?'<p>'+esc(g.note)+'</p>':'')+'</div><div class="educationActions">'+link(g.careers,'Entrar a la borsa')+bankLinks(g)+'</div></article>';
 const selected=trackingFilter==='all'?candidates:buckets[trackingFilter];
 const trackingNames={all:'Totes',unsent:'Encara no enviada',sent:'Enviades',renew:'Per tornar a enviar'};
 const filters='<div class="educationTrackingTabs" role="group" aria-label="Seguiment de candidatures">'+Object.entries(trackingNames).map(([key,label])=>'<button type="button" class="smallBtn" data-education-tracking="'+key+'" aria-pressed="'+(key===trackingFilter)+'">'+label+' <span>('+(key==='all'?candidates.length:buckets[key].length)+')</span></button>').join('')+'</div>';
 const results=selected.length?(view==='schools'?schoolResults(selected,trackingFilter):selected.map(view==='networks'?groupCard:portalCard).join('')):'<p>No hi ha coincidències amb aquests filtres.</p>';
 content.innerHTML=filters+'<div id="educationResults" tabindex="-1">'+results+'</div>' +'<details class="educationCoverage"><summary>Cobertura i verificació del directori</summary><p>Centres d’Infantil i Primària del directori oficial del curs actual. No garanteix exhaustivitat en temps real. '+linked+' centres tenen una xarxa vinculada mitjançant una llista contrastada o el seu domini institucional. Els altres continuen pendents de revisió; no es consideren automàticament independents.</p><p>Els correus provenen del directori oficial. «Web del centre» no significa que s’hi hagi verificat una borsa pròpia. Les inscripcions, el perfil i els enviaments són privats i no es publiquen a GitHub. L’estat de les borses es desa en aquest navegador i se sincronitza quan connectes el mateix compte de Google a Documents.</p><a href="https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4" target="_blank" rel="noopener">Consultar el directori oficial</a></details>';
 }
 h.addEventListener('change',e=>{const s=e.target.closest('[data-education-status]');if(!s)return;const key=portalKey(s.dataset.educationStatus);localStorage.setItem('jobPortal_'+key,JSON.stringify({...JSON.parse(localStorage.getItem('jobPortal_'+key)||'{}'),status:s.value,updated:new Date().toISOString()}));document.dispatchEvent(new Event('private-data-changed'))});
 h.addEventListener('click',e=>{const stageButton=e.target.closest('[data-education-stage]'),tab=e.target.closest('[data-education-view]'),mail=e.target.closest('[data-education-mail]'),profile=e.target.closest('[data-education-profile]'),location=e.target.closest('[data-education-location]');
 const trackingButton=e.target.closest('[data-education-tracking]');
 if(trackingButton){trackingFilter=trackingButton.dataset.educationTracking;resetTrackingPages();paint()}
 if(stageButton||tab){window.closeEducationRegistrations?.();trackingFilter='all'}
 if(stageButton){stage=stageButton.dataset.educationStage;window.educationStage=stage;resetTrackingPages();syncMap();paint()}
 if(tab){view=tab.dataset.educationView;resetTrackingPages();paint()}
 const pageButton=e.target.closest('[data-education-page]');
 if(pageButton){
   trackingPages[pageButton.dataset.educationBucket]=Number(pageButton.dataset.educationPage);
   paint();
   const position=document.getElementById('educationResults');
   position.focus({preventScroll:true});
   position.scrollIntoView({block:'start'});
 }
 if(mail){const x=schools.find(x=>String(x.id)===mail.dataset.educationMail);if(x)prepare({...x,applicationRole:roles[stage]})}
 const id=profile?.dataset.educationProfile||location?.dataset.educationLocation;
 if(id){const x=schools.find(s=>String(s.id)===id);if(x)(location?showSchoolOnMap:showSchool)(x)}
 });

 document.addEventListener('visibilitychange',()=>{if(!document.hidden)paint()});
 setInterval(()=>{if(!document.hidden)paint()},60000);
 window.renderEducationTracking=paint;
 document.addEventListener('private-data-changed',paint);
 document.addEventListener('candidature-history-changed',paint);document.addEventListener('private-data-restored',paint);window.addEventListener('storage',paint);
 window.educationStage=stage;paint();draw();
})();
