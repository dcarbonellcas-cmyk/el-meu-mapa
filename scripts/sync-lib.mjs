import {createHash} from 'node:crypto';
export const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const id=s=>String(Number(s));
export const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,d)=>String.fromCodePoint(parseInt(h||d,h?16:10))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[x]));
export const plain=s=>decode(decode(s)).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function relevant(title,description=''){
  const t=norm(title),all=norm(title+' '+description);
  if(/colonies|pernocta|casa d.estades|penitenciari|gent gran|tercera edad|neteja|limpieza|cuiner|cocinero|auxiliar de cuina/.test(t))return false;
  if(/casal civic|casal de gent/.test(t)&&!/infants|infantil|kids|joves|familia|nadons/.test(t))return false;
  return /infantil|bressol|llar d.infants|ludoteca|lleure|extraescolar|menjador|comedor|migdia|casal en familia/.test(t)||(/monitor|educador|coordinador|director|responsable|acollida|socioeduc|tallerista/.test(t)&&/infantil|bressol|infants|nens|ninos|escola|escolar|lleure|ocio educativo|ludoteca|casal infantil/.test(all));
}
export function schoolRows(rows,concerts){
  const funded=new Set(concerts.filter(x=>Object.entries(x).some(([k,v])=>k.startsWith('unitats_concertades_')&&Number(v)>0)).map(x=>id(x.codi_centre)));
  return rows.filter(x=>x.einf1c||x.einf2c).map(x=>({id:id(x.codi_centre),name:x.denominaci_completa,city:x.nom_municipi,county:x.nom_comarca,age:x.einf1c?(x.einf2c?'0-6':'0-3'):'3-6',kind:x.nom_naturalesa==='Públic'?'Pública':funded.has(id(x.codi_centre))?'Concertada':'Privada',lat:Number(x.coordenades_geo_y)||null,lng:Number(x.coordenades_geo_x)||null,email:x.e_mail_centre||'',phone:x.tel_fon||'',address:x.adre_a||'',postal:x.codi_postal||''}));
}
export function reconcile(previous,current,archived=[]){
  const now=new Set(current.map(x=>x.id)),before=new Set(previous.map(x=>x.id));
  const archive=new Map([...archived,...previous.filter(x=>!now.has(x.id))].map(x=>[x.id,x]));
  for(const key of now)archive.delete(key);
  return {added:current.filter(x=>!before.has(x.id)).map(x=>({id:x.id,name:x.name,city:x.city})),absent:previous.filter(x=>!now.has(x.id)).map(x=>({id:x.id,name:x.name,city:x.city})),archived:[...archive.values()]};
}
export function validateSchools(rows,previous){
  if(rows.length<3000||rows.length<previous.length*.8||rows.length>10000)throw Error('Directori incomplet o canvi excepcional: es conserva la còpia anterior');
  if(new Set(rows.map(x=>x.id)).size!==rows.length||rows.some(x=>!/^\d{7,8}$/.test(x.id)||!x.name||!x.city))throw Error('Directori no vàlid');
}
export function faJobs(items,now){
  return items.filter(x=>x.isOpenInscription&&x.status==='PUBLISHED'&&(!x.offerDetail?.closesAt||Date.parse(x.offerDetail.closesAt)>now)&&relevant(x.content?.title,x.content?.summary?.text)).map(x=>({id:'fa_'+x.reference,title:plain(x.content.title),school:plain(x.business?.name),city:plain(x.content.place),source:'Feina Activa',url:'https://feinaactiva.gencat.cat/search/offers/detail/'+encodeURIComponent(x.reference),snippet:plain(x.content.summary?.text).slice(0,320),created:x.publishedAt,expires:x.offerDetail?.closesAt||null,automatic:true}));
}
export function rssJobs(xml){
  if(!/<rss\b|<feed\b/.test(xml))throw Error('Resposta RSS no vàlida');
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].flatMap(([,s])=>{
    const get=t=>plain((s.match(new RegExp('<'+t+'\\b[^>]*>([\\s\\S]*?)<\\/'+t+'>','i'))||[])[1]);
    const title=get('title'),desc=get('description'),url=get('link');
    if(!/^https?:\/\//.test(url)||!relevant(title,desc)||!/catalu|barcelona|girona|tarragona|lleida/.test(norm(title+' '+desc)))return[];
    return[{id:'sepe_'+createHash('sha256').update(url).digest('hex').slice(0,24),title,school:'',city:'Catalunya',source:'Empléate / SEPE',url,snippet:desc.slice(0,320),created:new Date(get('pubDate')||Date.now()).toISOString(),automatic:true}];
  });
}
export function mergeSource(old,source,results,successful){return successful?[...old.filter(x=>x.source!==source),...results]:old;}
