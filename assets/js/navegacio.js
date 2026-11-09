(function(){
  const home=document.getElementById('homePage'), explore=document.getElementById('explorePage'), leisure=document.getElementById('leisurePage'), jobs=document.getElementById('jobsPage'), docs=document.getElementById('docsOverlay'), dash=document.getElementById('dashboardOverlay');
  async function updateDocsPage(){for(const [key,name,btn] of [['cv','docsCvName','docsCvOpen'],['letter','docsLetterName','docsLetterOpen'],['cvAlternative','docsCvAlternativeName','docsCvAlternativeOpen'],['recommendation','docsRecommendationName','docsRecommendationOpen']]){let d=null;try{d=await getDoc(key)}catch(e){}document.getElementById(name).textContent=d?'✓ '+d.name:'Cap fitxer guardat';document.getElementById(btn).style.display=d?'inline-block':'none'}}
  document.addEventListener('private-data-restored',()=>{updateDocsPage();refreshDocs()});
  function active(page) {
    const navPage = page === 'managers' ? 'explore' : page;
    document.querySelectorAll('.navbtn').forEach(button => {
      const isCurrent = button.dataset.page === navPage;
      button.classList.toggle('active', isCurrent);
      if (isCurrent) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  function show(page){
    document.getElementById('calendarPage').hidden=page!=='calendar';
    home.style.display='none';explore.style.display='none';leisure.style.display='none';jobs.style.display='none';docs.style.display='none';dash.style.display='none';document.getElementById('search').style.display='none';if(page==='home'){home.style.display='block'}else if(page==='explore'){explore.style.display='';document.getElementById('search').style.display='none';window.__renderManagers&&window.__renderManagers();setTimeout(()=>{if(window.map)map.invalidateSize()},80)}else if(page==='leisure'){leisure.style.display='block';if(typeof window.__renderLeisure==='function')window.__renderLeisure();}else if(page==='jobs'){jobs.style.display='block';if(typeof window.__renderJobs==='function')window.__renderJobs()}else if(page==='candidates'||page==='renew'){dash.style.display='block';const title=document.getElementById('dashboardTitle');if(title)title.textContent=page==='renew'?'🔔 Candidatures per renovar':'💌 Les meves candidatures';const sel=document.getElementById('dashStatus');if(sel)sel.value=page==='renew'?'Toca renovar candidatura':'';if(typeof window.__renderDash==='function')window.__renderDash()}else if(page==='docs'){docs.style.display='block';updateDocsPage()}else if(page==='calendar'){window.renderApplicationCalendar()}active(page)}
  window.appShow=show;
  document.querySelectorAll('[data-page]').forEach(b=>{if(b.id==='dashboardBtn')return;b.addEventListener('click',()=>show(b.dataset.page))});
  document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
  document.getElementById('dashboardBtn').addEventListener('click',e=>{e.stopImmediatePropagation();show('candidates')},true);
  document.getElementById('closeDashboard')?.addEventListener('click',e=>{e.stopImmediatePropagation();show('home')},true);
  for(const [key,input,open] of [['cv','docsCvInput','docsCvOpen'],['letter','docsLetterInput','docsLetterOpen'],['cvAlternative','docsCvAlternativeInput','docsCvAlternativeOpen'],['recommendation','docsRecommendationInput','docsRecommendationOpen']]){
    bindDocumentPicker(input,key,async ()=>{await updateDocsPage();await refreshDocs()});
    document.getElementById(open).addEventListener('click',()=>openDoc(key));
  }
  document.getElementById('dashRows').addEventListener('click',e=>{if(e.target.closest('.openSchoolDash'))show('explore')},true);
})();
