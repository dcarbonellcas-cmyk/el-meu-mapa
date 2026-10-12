import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {alertJobs,encryptFeed} from './gmail-lib.mjs';
const root=fileURLToPath(new URL('../assets/data/',import.meta.url));
const status=JSON.parse(await readFile(root+'sincronitzacio.json','utf8'));
const keys=['GMAIL_CLIENT_ID','GMAIL_CLIENT_SECRET','GMAIL_REFRESH_TOKEN','GMAIL_FEED_KEY'];
if(keys.every(k=>process.env[k])){
 try{
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(20000),body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID,client_secret:process.env.GMAIL_CLIENT_SECRET,refresh_token:process.env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'})});
  if(!tokenResponse.ok)throw Error('Google no ha pogut renovar l’autorització');
  const token=(await tokenResponse.json()).access_token;if(!token)throw Error('Autorització absent');
  async function api(path){const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error('Consulta Gmail fallida');return r.json()}
  const query='newer_than:30d {from:linkedin.com from:indeed.com from:infojobs.net from:b4work.com}';let page='',ids=[];
  do{const list=await api('messages?'+new URLSearchParams({q:query,maxResults:'100',...(page?{pageToken:page}:{})}));ids.push(...(list.messages||[]).map(x=>x.id));page=list.nextPageToken||'';if(ids.length>2000)throw Error('Massa alertes; cal revisar el filtre');}while(page);
  let jobs=[];for(const id of new Set(ids))jobs.push(...alertJobs(await api('messages/'+id+'?format=full')));
  jobs=[...new Map(jobs.map(x=>[x.id,x])).values()];
  const updatedAt=new Date().toISOString();await writeFile(root+'gmail-xifrat.json',JSON.stringify(encryptFeed({updatedAt,jobs},process.env.GMAIL_FEED_KEY))+'\n');
  status.sources.gmail={state:'ok',updatedAt,message:'Alertes privades xifrades; cal la clau personal per obrir-les.'};
 }catch{
  status.sources.gmail={...status.sources.gmail,state:'error',attemptedAt:new Date().toISOString(),message:'No s’han pogut actualitzar les alertes privades. Cal revisar l’autorització de Google.'};
  console.warn('Gmail: actualització fallida. No es mostren dades privades als registres.');
 }
}else status.sources.gmail={state:'pending',message:'Pendent d’autorització de Google i configuració de credencials privades.'};
await writeFile(root+'sincronitzacio.json',JSON.stringify(status,null,2)+'\n');
