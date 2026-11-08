// Private, immutable copies of confirmed sends. Never bundled with public data.
function applicationArchive(operation, value){return new Promise((resolve,reject)=>{
  const request=indexedDB.open('mapaEscolesEnviaments',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('sent',{keyPath:'gmailId'});
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('sent',operation==='put'?'readwrite':'readonly');let result;
    const r=operation==='put'?tx.objectStore('sent').put(value):tx.objectStore('sent').getAll();
    r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>{db.close();resolve(result)};tx.onerror=()=>{db.close();reject(tx.error)};
  };
})}
async function renderSentArchive(){
  const host=document.getElementById('sentArchive');if(!host)return;
  try{const rows=await applicationArchive('get');host.replaceChildren();
    const intro=document.createElement('p');intro.textContent='Còpies exactes dels nous enviaments fets des d’aquest navegador. Els enviaments antics no tenen còpia del text. Aquest historial encara no se sincronitza entre dispositius.';host.append(intro);
    for(const x of rows.sort((a,b)=>b.sentAt.localeCompare(a.sentAt))){const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('pre');
      summary.textContent=x.centre+' · '+new Date(x.sentAt).toLocaleString('ca-ES');
      text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';
      text.textContent='Per a: '+x.to+'\nTipus: '+x.role+'\nAssumpte: '+x.subject+'\nAdjunts: '+x.attachments.map(d=>d.name).join(', ')+'\n\n'+x.body;
      details.append(summary,text);host.append(details);
    }
    if(!rows.length){const p=document.createElement('p');p.textContent='Encara no hi ha enviaments arxivats.';host.append(p)}
  }catch(e){host.textContent='No s’ha pogut llegir l’historial privat: '+e.message}
}
function reviewApplication(snapshot,onConfirm){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.style.cssText='max-width:640px;width:calc(100% - 48px);border:1px solid #ccd9eb;border-radius:16px;padding:24px';
  const title=document.createElement('h2');title.textContent='Revisió abans d’enviar';
  const text=document.createElement('pre');text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:12pt/1.45 Arial,sans-serif;max-height:55vh;overflow:auto';
  text.textContent='Centre: '+snapshot.centre+'\nTipus: '+snapshot.role+'\nPer a: '+snapshot.to+'\nAssumpte: '+snapshot.subject+'\n\nAdjunts:\n'+snapshot.docs.map(d=>'• '+d.name).join('\n')+'\n\n'+snapshot.body;
  const cancel=document.createElement('button');cancel.className='smallBtn';cancel.textContent='Tornar a editar';
  const send=document.createElement('button');send.className='smallBtn';send.textContent='Confirmar i connectar Gmail';
  let done=false;const finish=value=>{if(done)return;done=true;dialog.close();dialog.remove();resolve(value)};
  cancel.onclick=()=>finish(false);send.onclick=()=>{finish(true);onConfirm?.()};dialog.oncancel=e=>{e.preventDefault();finish(false)};
  dialog.append(title,text,cancel,send);document.body.append(dialog);dialog.showModal();
})}
document.getElementById('refreshSentArchive')?.addEventListener('click',renderSentArchive);
renderSentArchive();
