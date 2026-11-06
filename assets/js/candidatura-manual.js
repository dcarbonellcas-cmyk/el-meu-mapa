// Manual confirmations never send a message or imply a portal account exists.
function manualApplicationButton(place){
  const last=hist(place.id).find(x=>x.type==='sent'&&x.source==='website');
  return '<button class="smallBtn '+(last?'educationSent':'')+'" data-manual-application="'+esc(place.id)+'" aria-label="Registrar candidatura enviada per web a '+esc(place.name)+'">'+(last?'✓ Enviada per web · '+esc(fmtDate(last.date)):'✓ He enviat la candidatura per web')+'</button>';
}
function recordManualApplication(place,{date,title='',url=''}){
  const at=new Date(date),now=new Date();
  if(!Number.isFinite(at.getTime())||at>now)throw Error('Indica una data vàlida que no sigui futura.');
  if(url&&!/^https?:\/\//i.test(url))throw Error('L’enllaç ha de començar per https:// o http://.');
  const entry={date:at.toISOString(),type:'sent',source:'website',text:'Candidatura enviada personalment per web'+(title?' · '+title:''),...(url?{url}:{}),recordedAt:now.toISOString()};
  const entries=[entry,...hist(place.id)].sort((a,b)=>b.date.localeCompare(a.date));
  localStorage.setItem('history_'+place.id,JSON.stringify(entries));
  // Backdating an application must not erase a later reply or interview.
  const later=entries.find(x=>x!==entry&&x.date>entry.date&&(['sent','replied','interview'].includes(x.type)||x.type==='status'));
  if(!later&&!['replied','interview'].includes(state(place.id)))localStorage.setItem('status_'+place.id,'sent');
  document.dispatchEvent(new Event('private-data-changed'));
  document.dispatchEvent(new Event('candidature-history-changed'));
  return entry;
}
(function(){
  const dialog=document.createElement('dialog');dialog.className='manualApplicationDialog';
  dialog.style.cssText='border:1px solid #dce5f2;border-radius:18px;padding:24px;width:min(480px,85vw);color:#173b72';
  dialog.innerHTML='<form><h2>Candidatura enviada per web</h2><p id="manualPlace"></p><p>Marca-ho només després d’haver enviat la candidatura. Obrir una pàgina o crear-hi un compte no és un enviament.</p><label>Data i hora de l’enviament<input id="manualDate" type="datetime-local" required style="display:block;margin:8px 0 16px;max-width:100%"></label><label>Oferta o lloc (opcional)<input id="manualTitle" maxlength="200" style="display:block;width:100%;margin:8px 0 16px"></label><label>Enllaç de l’oferta (opcional)<input id="manualUrl" type="url" style="display:block;width:100%;margin:8px 0 16px"></label><p id="manualError" role="alert"></p><button class="smallBtn" type="submit">✓ Confirmar candidatura enviada</button> <button class="smallBtn" type="button" id="manualCancel">Cancel·lar</button><p class="muted">Desat privat. Se sincronitza quan Google està connectat. Aquesta acció no envia cap correu.</p></form>';
  document.body.append(dialog);let place=null;
  dialog.querySelector('#manualCancel').addEventListener('click',()=>dialog.close());
  dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();try{recordManualApplication(place,{date:dialog.querySelector('#manualDate').value,title:dialog.querySelector('#manualTitle').value.trim(),url:dialog.querySelector('#manualUrl').value.trim()});dialog.close();window.__renderDash?.();window.__renderLeisure?.()}catch(error){dialog.querySelector('#manualError').textContent=error.message}});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-manual-application]');if(!b)return;
    const all=[...window.MAPA_DATA.centres,...window.MAPA_DATA.entitats.infantil,...window.MAPA_DATA.entitats.lleure];
    place=all.find(x=>String(x.id)===b.dataset.manualApplication);if(!place)return;
    dialog.querySelector('#manualPlace').textContent=place.name;
    const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
    dialog.querySelector('#manualDate').value=d.toISOString().slice(0,16);
    dialog.querySelector('#manualDate').max=d.toISOString().slice(0,16);
    dialog.querySelector('#manualTitle').value='';dialog.querySelector('#manualUrl').value='';dialog.querySelector('#manualError').textContent='';dialog.showModal();
  });
})();
