(function(){
  const JOBS_KEY='mapaEscolesJobs_v1';
  const loadJobs=()=>{try{return JSON.parse(localStorage.getItem(JOBS_KEY)||'[]')}catch(e){return []}};
  const saveJobs=a=>localStorage.setItem(JOBS_KEY,JSON.stringify(a));
  // Legacy examples are retained locally as unverified history, never seeded as live vacancies.
  const previous=loadJobs();previous.forEach(j=>{if(j.id?.startsWith('live_'))j.unverified=true;});saveJobs(previous);
  const escJob=x=>String(x||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function renderJobs(){const grid=document.getElementById('jobsGrid');if(!grid)return;const q=(document.getElementById('jobSearch').value||'').toLowerCase(),src=document.getElementById('jobSource').value,st=document.getElementById('jobStatus').value;let a=loadJobs().filter(j=>st==='inactive'?(j.inactive||j.unverified):(!j.inactive&&!j.unverified)).filter(j=>(!q||[j.title,j.school,j.city].join(' ').toLowerCase().includes(q))&&(!src||j.source===src)&&(!st||st==='inactive'||j.status===st));if(!a.length){grid.innerHTML='<div class="jobsEmpty"><div style="font-size:36px">🔎</div><b>Encara no tens ofertes guardades</b><div style="margin-top:7px">No hi ha ofertes amb aquests filtres. Prova “Totes les fonts” o prem “Actualitzar ofertes” per importar les alertes del Gmail.</div></div>';return}grid.innerHTML=a.map(j=>`<article class="jobCard" data-job-id="${escJob(j.id)}"><div class="jobTop"><div><div class="jobMeta">${escJob(j.city||'')}</div><h3>${escJob(j.title)}</h3><div class="jobMeta">${escJob(j.school||'Centre no indicat')}</div><div class="jobMeta">${escJob(j.inactive||j.unverified?'Oferta antiga o no verificada':j.stale?'Darrera còpia disponible; la font no s’ha pogut actualitzar':j.created?'Publicada: '+new Date(j.created).toLocaleDateString('ca-ES'):'')}</div></div><span class="jobSource">${escJob(j.source||'Altres')}</span></div><div class="jobActions">${j.url?`<button class="jobBtn primaryJob" data-open="${escJob(j.id)}">Obrir oferta</button>`:''}<button class="jobBtn" data-status="saved" data-id="${escJob(j.id)}">⭐ M’interessa</button><button class="jobBtn" data-status="applied" data-id="${escJob(j.id)}">✅ Enviada</button><button class="jobBtn" data-status="discarded" data-id="${escJob(j.id)}">🚫</button></div></article>`).join('')}
  document.getElementById('addJobBtn')?.addEventListener('click',()=>{const title=prompt('Nom del lloc de feina (ex. Educadora infantil 0–3):');if(!title)return;const school=prompt('Escola o empresa:')||'';const city=prompt('Municipi:')||'';const source=prompt('Font (LinkedIn, InfoJobs, Indeed, Facebook o Altres):','LinkedIn')||'Altres';const url=prompt('Enganxa l’enllaç de l’oferta (opcional):')||'';const a=loadJobs();a.unshift({id:Date.now().toString(),title,school,city,source,url,status:'saved',created:new Date().toISOString()});saveJobs(a);window.__renderJobs?.()});
  ['jobSearch','jobSource','jobStatus'].forEach(id=>document.getElementById(id)?.addEventListener(id==='jobSearch'?'input':'change',()=>window.__renderJobs?.()));
  document.getElementById('jobsGrid')?.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){const j=loadJobs().find(x=>x.id===open.dataset.open);if(j?.url&&/^https?:\/\//i.test(j.url))window.open(j.url,'_blank','noopener');return}const b=e.target.closest('[data-status]');if(!b)return;const a=loadJobs(),j=a.find(x=>x.id===b.dataset.id);if(j){j.status=b.dataset.status;saveJobs(a);window.__renderJobs?.()}});
  window.__renderJobs=renderJobs;
})();

(function(){
  let jobType='';
  function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
  function classify(j){const t=norm(j.title);if(/director|directora|coordinador|coordinadora|responsable.*(lleure|projecte|servei)/.test(t))return 'direccio';if(/menjador|migdia|comedor/.test(t))return 'menjador';if(/extraescolar|extraescolars/.test(t))return 'extraescolars';if(/acollida|acogida/.test(t))return 'acollida';if(/infantil|escola bressol|llar d.infants|educador.a infantil|mestre.a infantil|\btei\b|\b0\s*[-–]\s*3\b|\b3\s*[-–]\s*6\b/.test(t))return 'infantil';if(/monitor|monitora|lleure|casal|ludoteca|socioeduc/.test(t))return 'lleure';return ''}
  const oldRender=window.__renderJobs;
  if(oldRender){window.__renderJobs=function(){oldRender();if(!jobType)return;document.querySelectorAll('#jobsGrid .jobCard').forEach(card=>{let job={};try{job=JSON.parse(localStorage.getItem('mapaEscolesJobs_v1')||'[]').find(j=>j.id===card.dataset.jobId)||{}}catch{}card.style.display=classify(job)===jobType?'':'none'})}}
  document.querySelectorAll('.jobTypeFilter').forEach(b=>b.addEventListener('click',()=>{jobType=b.dataset.jtype||'';document.querySelectorAll('.jobTypeFilter').forEach(x=>x.classList.toggle('active',x===b));window.__renderJobs&&window.__renderJobs()}));
  async function liveSources(silent=false){
    const notice=document.getElementById('jobsSyncNotice');
    try{
      const r=await fetch('assets/data/ofertes.json',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();
      const old=JSON.parse(localStorage.getItem('mapaEscolesJobs_v1')||'[]'),by=new Map(old.map(j=>[j.id,j])),present=new Set();let added=0;
      for(const j of data.jobs||[]){present.add(j.id);const existing=by.get(j.id);if(!existing)added++;const source=data.sources?.[j.source==='Feina Activa'?'feinaActiva':'sepe'];by.set(j.id,{...j,status:existing?.status||'saved',inactive:false,stale:source?.state!=='ok'});}
      for(const j of by.values())if(j.automatic&&!present.has(j.id))j.inactive=true;
      localStorage.setItem('mapaEscolesJobs_v1',JSON.stringify([...by.values()]));
      window.__renderJobs?.();
      if(!silent&&notice){notice.style.display='block';notice.textContent='Ofertes públiques carregades: '+(data.jobs||[]).length+'. Comprovació: '+new Date(data.checkedAt).toLocaleString('ca-ES')+'. S’actualitzen cada 6 hores. '+(data.sources?.sepe?.state==='error'?'SEPE no ha respost a la darrera consulta. ':'')+'Gmail requereix completar la connexió privada.';}
      return added;
    }catch(e){if(!silent&&notice){notice.style.display='block';notice.textContent='No s’ha pogut carregar la darrera còpia d’ofertes. Es conserven les que tenies: '+e.message;}return 0;}
  }
  window.__syncLiveJobSources=liveSources;
  if(location.protocol!=='file:'){liveSources(true);setInterval(()=>{if(!document.hidden)liveSources(true)},600000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)liveSources(true)});}
})();
