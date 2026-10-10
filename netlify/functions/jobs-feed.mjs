const KEYWORDS = [
  'infantil','escola bressol','llar d\'infants','llar d’infants','educador infantil','educadora infantil','mestre infantil','mestra infantil','tècnic infantil','tecnic infantil','tei',
  'lleure','monitor','monitora','coordinador','coordinadora','director de lleure','directora de lleure','casal','menjador','migdia','extraescolar','acollida','ludoteca','socioeduc'
];
const EXCLUDE = ['colònies','colonies','casa de colònies','casa de colonies','pernocta'];
const strip = s => (s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const relevant = s => { const x=strip(s).toLowerCase(); return KEYWORDS.some(k=>x.includes(k)) && !EXCLUDE.some(k=>x.includes(k)); };
async function feinaActiva(){
  const url='https://feinaactiva.gencat.cat/search/offers/list?jobCategory=08';
  const html=await (await fetch(url,{headers:{'user-agent':'Mozilla/5.0 ElMeuMapa/1.0'}})).text();
  const jobs=[];
  const re=/<a[^>]+href="([^"]*\/search\/offers\/detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]{0,900}?)(?=<a[^>]+href="[^"]*\/search\/offers\/detail\/|$)/gi;
  let m;
  while((m=re.exec(html))&&jobs.length<120){const title=strip(m[2]), tail=strip(m[3]); if(!relevant(title+' '+tail)) continue; const href=new URL(m[1],url).href; jobs.push({id:'fa_'+href.split('/').pop(),title,school:'',city:(tail.match(/(?:Barcelona|Girona|Tarragona|Lleida)[^·|]{0,90}/i)||['Catalunya'])[0],source:'Feina Activa',url:href,snippet:tail.slice(0,320),created:new Date().toISOString()});}
  return jobs;
}
async function sepe(){
  const url='https://bnde.sistemanacionalempleo.es/es/portaltrabaja/resources/rss/Educacion_ServiciosSociales.xml';
  const xml=await (await fetch(url,{headers:{'user-agent':'Mozilla/5.0 ElMeuMapa/1.0'}})).text();
  const jobs=[]; const re=/<item>([\s\S]*?)<\/item>/gi; let m;
  while((m=re.exec(xml))&&jobs.length<150){const x=m[1];const get=t=>strip((x.match(new RegExp('<'+t+'[^>]*>([\\s\\S]*?)<\\/'+t+'>','i'))||[])[1]||'');const title=get('title'),desc=get('description'),link=get('link');if(!relevant(title+' '+desc))continue;if(!/catalu|barcelona|girona|tarragona|lleida/i.test(title+' '+desc))continue;jobs.push({id:'sepe_'+Buffer.from(link||title).toString('base64url').slice(0,32),title,school:'',city:'Catalunya',source:'Empléate / SEPE',url:link,snippet:desc.slice(0,320),created:new Date().toISOString()});}
  return jobs;
}
export default async () => {
  try {const results=await Promise.allSettled([feinaActiva(),sepe()]);const all=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);const map=new Map();for(const j of all)map.set(j.url||j.id,j);return new Response(JSON.stringify({updatedAt:new Date().toISOString(),jobs:[...map.values()]}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900'}})} catch(e){return new Response(JSON.stringify({error:e.message,jobs:[]}),{status:500,headers:{'content-type':'application/json'}})}
};
