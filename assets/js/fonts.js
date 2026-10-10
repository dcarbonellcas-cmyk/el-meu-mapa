(function(){
 const d=document.getElementById('dataUpdateDate'), b=document.getElementById('checkDataSources');
 const k='dataSourcesChecked_v1';
 function paint(){const v=localStorage.getItem(k); d.textContent=v?'Última comprovació des d’aquest navegador: '+new Date(v).toLocaleString('ca-ES'):'Encara no has comprovat les fonts en aquest navegador.'}
 b?.addEventListener('click',()=>{localStorage.setItem(k,new Date().toISOString());paint();alert('✓ Fonts preparades. La sincronització automàtica completa s’activarà quan aquesta versió es publiqui amb la funció programada del servidor. En local, el navegador no pot executar actualitzacions mentre la web està tancada.');});
 paint();
})();
