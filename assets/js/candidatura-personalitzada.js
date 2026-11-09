const CANDIDATURE_ROLES={
  infantil03:{label:'Educació infantil · 0–3',title:'educadora infantil de 0 a 3 anys',focus:'acompanyar els infants en les rutines, el joc i el desenvolupament de la seva autonomia'},
  infantil36:{label:'Educació infantil · 3–6',title:'mestra d’educació infantil de 3 a 6 anys',focus:'acompanyar l’aprenentatge a través del joc, l’experimentació i les propostes d’aula'},
  infantil:{label:'Educació infantil · 0–6',title:'professional d’educació infantil',focus:'acompanyar els infants respectant els seus ritmes i necessitats'},
  primaria:{label:'Primària · reforç i suport educatiu',title:'educadora de reforç i suport a Primària',focus:'donar suport als aprenentatges de Primària i acompanyar els hàbits d’estudi'},
  monitoratge:{label:'Lleure · monitora',title:'monitora de lleure',focus:'preparar i dinamitzar activitats adequades al grup i afavorir la participació dels infants'},
  vetlladora:{label:'Suport educatiu · vetlladora',title:'vetlladora de suport educatiu',focus:'acompanyar la participació, l’autonomia i les necessitats de suport dels infants'},
  direccio:{label:'Lleure · directora',title:'directora de lleure',focus:'planificar les activitats, organitzar l’equip i vetllar pel bon funcionament del servei'},
  coordinacio:{label:'Coordinació educativa',title:'coordinadora educativa',focus:'organitzar les propostes, coordinar el dia a dia i mantenir una comunicació clara amb l’equip'},
  menjador:{label:'Menjador escolar',title:'monitora de menjador escolar',focus:'acompanyar els hàbits durant els àpats i dinamitzar l’estona de lleure del migdia'},
  extraescolars:{label:'Activitats extraescolars',title:'educadora d’activitats extraescolars',focus:'preparar activitats educatives i adaptar-les a les edats i necessitats del grup'},
  acollida:{label:'Acollida escolar',title:'monitora d’acollida escolar',focus:'oferir un acompanyament proper als infants durant l’estona d’acollida'}
};
function inferCandidatureRole(place,filter='all'){
  if(place.applicationRole&&CANDIDATURE_ROLES[place.applicationRole])return place.applicationRole;
  if(place.age==='primaria')return 'primaria';
  if(place.age)return place.age==='0-3'?'infantil03':place.age==='3-6'?'infantil36':'infantil';
  const role=String(place.role||place.jobTitle||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/vetllador/.test(role))return 'vetlladora';if(/director/.test(role))return 'direccio';if(/coordin/.test(role))return 'coordinacio';
  if(/primaria|reforc/.test(role))return 'primaria';if(/menjador|comedor/.test(role))return 'menjador';
  if(/extraescolar/.test(role))return 'extraescolars';if(/acollida|acogida/.test(role))return 'acollida';
  return ({all:'direccio',coord:'direccio',monitor:'monitoratge',migdia:'menjador',extra:'extraescolars',casal:'monitoratge',acollida:'acollida'})[filter]||'monitoratge';
}
function composeCandidature(place,role,profile){
  const config=CANDIDATURE_ROLES[role]||CANDIDATURE_ROLES.monitoratge;
  const name=String(profile.name||'Diana').trim();
  const experience=String(profile.roleBio?.[role]||'').trim();
  const centre=String(place.name||'el vostre centre').trim(),city=String(place.city||'').trim();
  const subject='Candidatura – '+config.label+' – '+centre+' – '+name;
  const vacancy=String(place.jobTitle||place.offerTitle||'').trim();
  const body='Bon dia,\n\n'+
    'Em dic '+name+' i em poso en contacte amb vosaltres per fer-vos arribar la meva candidatura com a '+config.title+' a '+centre+(city?' ('+city+')':'')+(vacancy?', en relació amb l’oferta «'+vacancy+'»':'')+'.\n\n'+
    'Us faig arribar el meu currículum i la documentació seleccionada per a aquesta candidatura, per si el meu perfil pot encaixar '+(vacancy?'en aquesta vacant':'en algun procés de selecció actual o futur del vostre centre')+'.\n\n'+
    (role==='primaria'?'Tinc el grau d’Educació Infantil amb menció en Pedagogia Terapèutica i actualment curso el grau d’Educació Primària a la UNIR. Em queda aproximadament un any per acabar-lo. La meva experiència en reforç escolar i coordinació d’aula m’ha permès acompanyar infants de Primària en els aprenentatges i els hàbits d’estudi.\n\n':'')+
    (experience?experience+'\n\n':'Podeu consultar al currículum la meva formació i experiència per valorar-ne l’adequació a les necessitats del vostre equip.\n\n')+
    'M’agradaria tenir l’oportunitat de formar part de l’equip de '+centre+' i aportar-hi la meva experiència, compromís i motivació per '+config.focus+'.\n\n'+
    'Podeu consultar també el meu currículum professional complet aquí:\nhttps://diana-carbonell-curriculum.dcarbonellcas.chatgpt.site/\n\n'+
    'Resto a la vostra disposició per ampliar qualsevol informació o per mantenir una entrevista personal.\n\nMoltes gràcies pel vostre temps i per valorar la meva candidatura.\n\nAtentament,\nDiana';
  return {subject,body,ready:true,personalized:!!experience||role==='primaria'};
}
(() => {
  const select=document.getElementById('draftRole'),hint=document.getElementById('draftRoleHint');
  const subject=document.getElementById('draftSubject'),body=document.getElementById('draftBody');
  let place=null,lastGenerated=null,lastRole='';
  select.innerHTML=Object.entries(CANDIDATURE_ROLES).map(([key,x])=>'<option value="'+key+'">'+x.label+'</option>').join('');
  function generate(checkEdits=true){
    if(!place)return;
    if(checkEdits&&lastGenerated&&(subject.value!==lastGenerated.subject||body.value!==lastGenerated.body)&&!confirm('Has editat l’escrit. Vols substituir-lo pel text del nou tipus de candidatura?')){select.value=lastRole;return}
    const role=select.value;lastGenerated=composeCandidature(place,role,candidateProfile());lastRole=role;
    subject.value=lastGenerated.subject;body.value=lastGenerated.body;
    document.getElementById('sendGmail').disabled=!lastGenerated.ready;
    document.getElementById('sendGmail').textContent='✉ Enviar amb Gmail';
    hint.textContent=lastGenerated.personalized?'Text adaptat a '+place.name+' i al tipus de candidatura. El pots editar abans d’enviar.':'Correu complet preparat per a '+place.name+'. En aquest dispositiu falta la teva experiència específica: recupera el perfil a Documents per afegir-la. El text actual no inventa cap titulació ni experiència.';
  }
  window.beginTailoredDraft=target=>{place=target;const filter=typeof leisureFilter!=='undefined'?leisureFilter:'all';select.value=inferCandidatureRole(target,filter);lastGenerated=null;generate(false)};
  select.addEventListener('change',()=>generate());document.getElementById('regenerateDraft').addEventListener('click',()=>generate());
  document.addEventListener('private-data-restored',()=>{if(place&&lastGenerated&&subject.value===lastGenerated.subject&&body.value===lastGenerated.body)generate(false)});
})();
