import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {plain,relevant} from './sync-lib.mjs';
const domains={'LinkedIn':'linkedin.com','InfoJobs':'infojobs.net','Indeed':'indeed.com','B4work':'b4work.com'};
export function alertJobs(message){
  const headers=Object.fromEntries((message.payload?.headers||[]).map(h=>[h.name.toLowerCase(),h.value]));
  const from=String(headers.from||'').toLowerCase();
  const source=Object.keys(domains).find(s=>from.includes(domains[s]));if(!source)return[];
  const parts=[];function collect(p){if(p?.body?.data)parts.push(Buffer.from(p.body.data,'base64url').toString('utf8'));for(const c of p?.parts||[])collect(c)}collect(message.payload);
  const offers=[];
  for(const text of parts){
    for(const match of text.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
      const title=plain(match[2]),href=plain(match[1]);
      try{
        const url=new URL(href),d=domains[source];
        if(url.protocol!=='https:'||!(url.hostname===d||url.hostname.endsWith('.'+d))||!/jobs\/view|viewjob|rc\/clk|oferta|empleo|job|b4work/.test(url.pathname))continue;
        if(/unsubscribe|privacy|settings|preferences|search|login/.test(url.pathname)||!relevant(title)||title.length>200)continue;
        // Keep only job links and labels; never publish email headers, bodies or the Gmail message ID.
        offers.push({id:'mail_'+createHash('sha256').update(href).digest('hex').slice(0,24),title,school:'',city:'',source,url:href,created:new Date(Number(message.internalDate)).toISOString(),privateFeed:true});
      }catch{}
    }
  }
  return [...new Map(offers.map(x=>[x.id,x])).values()];
}
export function encryptFeed(payload,key){
  const bytes=Buffer.from(key,'base64');if(bytes.length!==32)throw Error('La clau privada ha de tenir 32 bytes');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',bytes,iv);cipher.setAAD(Buffer.from('el-meu-mapa-gmail-v1'));
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final(),cipher.getAuthTag()]);
  return {version:1,algorithm:'AES-GCM',iv:iv.toString('base64'),ciphertext:ciphertext.toString('base64')};
}
