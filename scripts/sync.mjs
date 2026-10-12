import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {schoolRows,reconcile,validateSchools,faJobs,rssJobs,mergeSource} from './sync-lib.mjs';
const root=fileURLToPath(new URL('../assets/data/',import.meta.url));
const read=async(name,fallback)=>{try{return JSON.parse(await readFile(root+name,'utf8'))}catch{return fallback}};
const write=(name,value)=>writeFile(root+name,JSON.stringify(value,null,2)+'\n');
const now=new Date().toISOString();
const status=await read('sincronitzacio.json',{sources:{}});status.checkedAt=now;status.schedule='Cada 6 hores';
async function request(url,type='json'){
  const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'ElMeuMapa/2.0 (+https://dcarbonellcas-cmyk.github.io/el-meu-mapa/)'}});
  if(!r.ok)throw Error('HTTP '+r.status);return type==='json'?r.json():r.text();
}
function failure(key,e){status.sources[key]={...status.sources[key],state:'error',attemptedAt:now,message:String(e.message).slice(0,180)};console.warn(key+': no actualitzat; es conserva la darrera còpia.');}
const soda=(dataset,params)=>'https://analisi.transparenciacatalunya.cat/resource/'+dataset+'.json?'+new URLSearchParams(params);
async function dataset(dataset,field,min){
  const latest=await request(soda(dataset,{$select:field,$group:field,$order:field+' DESC',$limit:'1'}));
  const course=latest[0]?.[field];if(!/^20\d{2}[-/]20\d{2}$/.test(course||''))throw Error('Curs no vàlid');
  const where=field+"='"+course+"'";
  const count=Number((await request(soda(dataset,{$select:'count(*) as total',$where:where})))[0]?.total);
  if(count<min||count>20000)throw Error('Recompte no vàlid');
  let rows=[];for(let offset=0;offset<count;offset+=5000)rows.push(...await request(soda(dataset,{$where:where,$limit:'5000',$offset:String(offset),$order:'codi_centre'})));
  if(rows.length!==count)throw Error('Resposta incompleta');return {course,rows};
}
async function schools(){
  const previous=await read('centres.json',[]);
  try{
    const [directory,concerts]=await Promise.all([dataset('kvmv-ahh4','curs',3000),dataset('8spq-9nx7','curs_escolar',400)]);
    const current=schoolRows(directory.rows,concerts.rows);validateSchools(current,previous);
    const changes=reconcile(previous,current,await read('centres-arxivats.json',[]));
    await write('centres.json',current);await write('centres-arxivats.json',changes.archived);
    const old=await read('canvis-centres.json',{});
    if(changes.added.length||changes.absent.length)await write('canvis-centres.json',{updatedAt:now,added:changes.added,absent:changes.absent});else if(!old.updatedAt)await write('canvis-centres.json',{updatedAt:now,added:[],absent:[]});
    status.sources.centres={state:'ok',updatedAt:now,course:directory.course,count:current.length,concertCourse:concerts.course,archiveCount:changes.archived.length,url:'https://analisi.transparenciacatalunya.cat/d/kvmv-ahh4'};
  }catch(e){failure('centres',e)}
}
async function jobs(){
  const previous=await read('ofertes.json',{jobs:[]});let all=previous.jobs||[];
  try{
    const base='https://feinaactiva.gencat.cat/api/offers/list?jobCategory=08&limit=20&sort=date&order=desc&page=';
    const first=await request(base+'1');if(!Array.isArray(first.included)||!Number.isInteger(first.total)||first.total>4000)throw Error('Llista no vàlida');
    const items=[...first.included];
    for(let page=2;page<=Math.ceil(first.total/20);page++){
      const next=await request(base+page);if(!Array.isArray(next.included)||!next.included.length)throw Error('Pàgina incompleta');items.push(...next.included);
    }
    const unique=new Map(items.map(x=>[x.reference,x]));if(unique.size<first.total*.98)throw Error('Paginació incompleta');
    const fresh=faJobs([...unique.values()],Date.now());all=mergeSource(all,'Feina Activa',fresh,true);
    status.sources.feinaActiva={state:'ok',updatedAt:now,count:fresh.length,reviewed:unique.size,url:'https://feinaactiva.gencat.cat/search/offers/list?jobCategory=08'};
  }catch(e){failure('feinaActiva',e)}
  try{
    const url='https://bnde.sistemanacionalempleo.es/es/portaltrabaja/resources/rss/Educacion_ServiciosSociales.xml';
    const fresh=rssJobs(await request(url,'text'));all=mergeSource(all,'Empléate / SEPE',fresh,true);
    status.sources.sepe={state:'ok',updatedAt:now,count:fresh.length,url};
  }catch(e){failure('sepe',e)}
  all=all.filter(x=>!x.expires||Date.parse(x.expires)>Date.now());
  await write('ofertes.json',{checkedAt:now,sources:{feinaActiva:status.sources.feinaActiva,sepe:status.sources.sepe},jobs:all});
}
await Promise.all([schools(),jobs()]);
status.sources.gmail={state:process.env.GMAIL_REFRESH_TOKEN?'configured':'pending',message:'Cal autorització de Google i credencials privades. Les alertes només es publiquen xifrades.'};
await write('sincronitzacio.json',status);
console.log('Sincronització acabada; consulta els estats de cada font.');
