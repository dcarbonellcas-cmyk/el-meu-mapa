let LEGACY_EXCEL=loadLegacyRows();
(function(){
 function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
 function importLegacy(){
   if(localStorage.getItem('legacy_excel_import_v1')==='done')return;
   const mapStatus={'CV enviat':'sent',"Pendent d'enviar":'prepared','Entrevista realitzada':'interview'};
   for(const r of LEGACY_EXCEL){if(!r.matchedId)continue; const id=r.matchedId; const key='status_'+id; if(!localStorage.getItem(key)&&mapStatus[r.status])localStorage.setItem(key,mapStatus[r.status]);
     let h=[];try{h=JSON.parse(localStorage.getItem('history_'+id)||'[]')}catch(e){}
     if(r.sentDate && !h.some(x=>x.type==='sent'&&String(x.date).slice(0,10)===r.sentDate.slice(0,10))) h.push({date:r.sentDate,type:'sent',text:'CV enviat · importat de l’Excel antic'});
     if(r.status && r.status!=='CV enviat' && !h.some(x=>x.text==='Excel antic: '+r.status)) h.push({date:r.sentDate||new Date().toISOString(),type:'legacy',text:'Excel antic: '+r.status});
     h.sort((a,b)=>new Date(b.date)-new Date(a.date)); localStorage.setItem('history_'+id,JSON.stringify(h));
     const extra=[r.notes,r.response,r.stars?('Interès personal: '+r.stars):''].filter(Boolean).join(' · '); if(extra&&!localStorage.getItem('note_'+id))localStorage.setItem('note_'+id,extra);
   }
   localStorage.setItem('legacy_excel_import_v1','done');
 }
 document.getElementById('legacyImport').addEventListener('change', async e=>{
   try {
     const file=e.target.files[0]; if(!file)return;
     const rows=JSON.parse(await file.text());
     if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||typeof r.name!=='string'))throw new Error('Fitxer d’historial no vàlid.');
     if(!confirm('Importar aquest historial al navegador? Es conservaran els estats i les notes que ja hi tens.'))return;
     LEGACY_EXCEL=rows; localStorage.setItem('mapaEscolesLegacyRows_v1',JSON.stringify(rows));
     localStorage.removeItem('legacy_excel_import_v1'); importLegacy(); renderLegacy();
     draw(); window.__renderDash?.();
   } catch(err){alert('No s’ha pogut importar: '+err.message)} finally{e.target.value=''}
 });
 function renderLegacy(){document.getElementById('legacySummary').textContent=LEGACY_EXCEL.length+' registres locals; '+LEGACY_EXCEL.filter(r=>r.matchedId).length+' coincideixen amb centres del mapa.';const q=(document.getElementById('legacySearch')?.value||'').toLowerCase(),f=document.getElementById('legacyFilter')?.value||''; const a=LEGACY_EXCEL.filter(r=>(!q||(r.name+' '+r.city).toLowerCase().includes(q))&&(!f||(f==='matched'?!!r.matchedId:!r.matchedId))); document.getElementById('legacyRows').innerHTML=a.map(r=>`<tr style="border-top:1px solid #edf1f7"><td style="padding:10px;font-weight:700">${esc(r.name)}</td><td>${esc(r.city)}</td><td>${esc(r.status||'—')}</td><td>${esc(r.sentDateText||'—')}</td><td>${esc(r.email||r.phone||'—')}</td><td>${esc(r.stars||'—')}</td><td>${r.matchedId?`<span style="color:#16803a;font-weight:700">✓ ${esc(r.matchedName)}</span>`:'<span style="color:#a56a00">Per revisar</span>'}</td></tr>`).join('');}
 if(LEGACY_EXCEL.length)importLegacy();
 document.getElementById('legacyExcelBtn')?.addEventListener('click',()=>{document.getElementById('legacyExcelOverlay').style.display='block';renderLegacy();}); document.getElementById('closeLegacyExcel')?.addEventListener('click',()=>document.getElementById('legacyExcelOverlay').style.display='none'); document.getElementById('legacySearch')?.addEventListener('input',renderLegacy); document.getElementById('legacyFilter')?.addEventListener('change',renderLegacy);
 setTimeout(()=>{try{draw();}catch(e){} try{window.__renderDash&&window.__renderDash();}catch(e){}},50);
})();
