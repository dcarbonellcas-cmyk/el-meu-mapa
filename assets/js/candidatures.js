(function(){
  const statuses = ["No contactada","CV preparat","CV enviat","Toca renovar candidatura","Han contestat","Entrevista"];
  const statusColors = {"No contactada":"#b9c6d8","CV preparat":"#f5a623","CV enviat":"#16a34a","Toca renovar candidatura":"#f59e0b","Han contestat":"#7b4de2","Entrevista":"#ec4b91"};

  function allSchools(){
    if(window.MAPA_DATA) return [...window.MAPA_DATA.centres,...(window.MAPA_DATA.archived||[]).filter(s=>localStorage.getItem('status_'+s.id)||localStorage.getItem('history_'+s.id)).map(s=>({...s,name:s.name+' · no consta al directori actual d’infantil'}))];
    if (Array.isArray(window.SCHOOLS)) return window.SCHOOLS;
    if (typeof schools !== "undefined" && Array.isArray(schools)) return schools;
    if (typeof CENTRES !== "undefined" && Array.isArray(CENTRES)) return CENTRES;
    return [];
  }
  function sid(s){ return String(s.id ?? s.code ?? s.codi ?? ""); }
  function stateFor(s){
    const id=sid(s);
    const key=localStorage.getItem("status_"+id)||"none";
    const labels={none:"No contactada",prepared:"CV preparat",sent:"CV enviat",replied:"Han contestat",interview:"Entrevista"};
    let h=[]; try{h=JSON.parse(localStorage.getItem("history_"+id)||"[]")}catch(e){}
    const last=h.find(x=>x.type==="sent"); let label=labels[key]||"No contactada"; if(key==="sent"&&last){const d=new Date(last.date);d.setMonth(d.getMonth()+3);if(Date.now()>=d.getTime())label="Toca renovar candidatura";} return {status:label, date:(last&&last.date)||((h[0]&&h[0].date)||"")};
  }
  function val(s, keys, fallback=""){
    for(const k of keys) if(s && s[k]!==undefined && s[k]!==null && String(s[k]).trim()!=="") return s[k];
    return fallback;
  }
  function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}

  function render(){
    const data=allSchools();
    const counts=Object.fromEntries(statuses.map(x=>[x,0]));
    data.forEach(s=>counts[stateFor(s).status]=(counts[stateFor(s).status]||0)+1);
    const cards=document.getElementById("dashCards");
    cards.innerHTML=statuses.map(st=>`<button class="dashCard" data-status="${st}" style="text-align:left;background:white;border:1px solid #dce5f2;border-radius:15px;padding:15px;cursor:pointer">
      <div style="width:10px;height:10px;border-radius:50%;background:${statusColors[st]};margin-bottom:10px"></div>
      <div style="font-size:26px;font-weight:800">${counts[st]||0}</div><div style="font-size:13px;color:#657897">${st}</div></button>`).join("");

    const q=(document.getElementById("dashSearch").value||"").toLowerCase();
    const sf=document.getElementById("dashStatus").value;
    const rows=data.filter(s=>{
      const st=stateFor(s).status;
      const hay=(val(s,["name","nom","Denominació_completa"])+" "+val(s,["city","municipality","municipi","Nom_municipi"])).toLowerCase();
      const scope=document.getElementById('dashScope')?.value||''; return (!scope||scope==='infantil') && (!q||hay.includes(q)) && (!sf||st===sf) && (st!=="No contactada" || sf==="No contactada");
    });
    const tbody=document.getElementById("dashRows");
    tbody.innerHTML=rows.slice(0,1000).map(s=>{
      const st=stateFor(s);
      const type=val(s,["kind","type","tipus"],"");
      const stage=val(s,["stage","age","etapa"],"");
      return `<tr style="border-top:1px solid #edf1f7">
        <td style="padding:12px 10px;font-weight:700">${esc(val(s,["name","nom","Denominació_completa"],"Centre"))}</td>
        <td>${esc(val(s,["city","municipality","municipi","Nom_municipi"],""))}</td>
        <td>${esc(type)}</td><td>${esc(stage)}</td>
        <td><span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${statusColors[st.status]}22;color:#173b72;font-weight:700;font-size:12px">${esc(st.status)}</span></td>
        <td style="color:#7183a4">${esc(st.date||"—")}</td>
        <td><button class="openSchoolDash" data-id="${esc(sid(s))}" style="border:0;background:#edf4ff;color:#1769e8;border-radius:9px;padding:7px 10px;cursor:pointer;font-weight:700">Obrir</button></td>
      </tr>`;
    }).join("");
    document.getElementById("dashEmpty").style.display=rows.length?"none":"block";
    tbody.style.display=rows.length?"table-row-group":"none";
  }

  window.__renderDash=render;
  function openDash(){document.getElementById("dashboardOverlay").style.display="block";render();}
  function closeDash(){document.getElementById("dashboardOverlay").style.display="none";}

  document.getElementById("dashboardBtn")?.addEventListener("click",openDash);
  document.getElementById("closeDashboard")?.addEventListener("click",closeDash);
  document.getElementById("dashSearch")?.addEventListener("input",render);
  document.getElementById("dashStatus")?.addEventListener("change",render);
  document.getElementById("dashCards")?.addEventListener("click",e=>{
    const b=e.target.closest(".dashCard"); if(!b)return;
    document.getElementById("dashStatus").value=b.dataset.status; render();
  });
  document.getElementById("dashRows")?.addEventListener("click",e=>{
    const b=e.target.closest(".openSchoolDash"); if(!b)return;
    const id=String(b.dataset.id); closeDash();
    const s=allSchools().find(x=>sid(x)===id);
    if(!s)return;
    if(typeof window.openSchool==="function") window.openSchool(id);
    else if(typeof openSchool==="function") openSchool(id);
    else {
      const card=document.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if(card) card.click();
    }
  });
})();
