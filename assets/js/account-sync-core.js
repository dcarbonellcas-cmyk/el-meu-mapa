// Private account storage. Authentication is handled by Base44, never by this file.
(function(root){
  const APP='6af755059e0add3fad1a1601',API='https://app.base44.com/api/apps/'+APP;
  const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s)};
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function digest(data){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',data)))}
  function validateRef(ref){
    if(!ref||typeof ref.file_uri!=='string'||!ref.file_uri.startsWith('private/')||ref.file_uri.length>2000||typeof ref.key!=='string'||typeof ref.iv!=='string'||bytes(ref.key).length!==32||bytes(ref.iv).length!==12||typeof ref.hash!=='string')throw Error('La còpia del compte no és vàlida.');
    return ref;
  }
  class AccountStore{
    constructor({token='',fetcher=(...args)=>root.fetch(...args)}={}){this.token=token;this.fetcher=fetcher}
    async request(path,{method='GET',body}={}){
      const headers={'X-App-Id':APP};if(this.token)headers.Authorization='Bearer '+this.token;
      if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
      const r=await this.fetcher(API+path,{method,headers,body,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(60000)});
      if(!r.ok){const error=Error(r.status===401?'La sessió ha caducat. Torna a entrar amb el teu compte.':r.status===429?'El servei ha arribat al límit temporal. Els canvis locals es conserven.':r.status===403?'El servei no permet aquesta operació. Els canvis locals es conserven.':'No s’ha pogut connectar amb el compte ('+r.status+'). Els canvis locals es conserven.');error.status=r.status;throw error}
      return r.status===204?null:r.json();
    }
    me(){return this.request('/entities/User/me')}
    async login(email,password){let result;try{result=await this.request('/auth/login',{method:'POST',body:{email,password}})}catch(error){if(error.status===401)error.message='El correu o la contrasenya no són correctes.';throw error}if(!result.access_token)throw Error('No s’ha completat l’accés. Revisa si el compte demana una verificació addicional.');this.token=result.access_token;return result}
    register(email,password){return this.request('/auth/register',{method:'POST',body:{email,password}})}
    verify(email,otpCode){return this.request('/auth/verify-otp',{method:'POST',body:{email,otp_code:otpCode}})}
    resend(email){return this.request('/auth/resend-otp',{method:'POST',body:{email}})}
    reset(email){return this.request('/auth/reset-password-request',{method:'POST',body:{email}})}
    async list(userId){
      const rows=[];let cursor='';
      do{const q=new URLSearchParams({q:JSON.stringify({created_by_id:userId}),limit:'100',sort:'created_date'});if(cursor)q.set('cursor',cursor);const page=await this.request('/entities/SyncDevice/v2/list?'+q);if(!Array.isArray(page.items))throw Error('Resposta del compte no vàlida.');rows.push(...page.items);if(rows.length>100)throw Error('Aquest compte té massa dispositius registrats.');cursor=page.has_more?page.next_cursor:'';if(page.has_more&&!cursor)throw Error('Resposta incompleta del compte.')}while(cursor);
      return rows;
    }
    save(id,data){return this.request('/entities/SyncDevice'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',body:data})}
    async upload(data,previous){
      const hash=await digest(data);if(previous?.hash===hash)return previous;
      const key=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
      const imported=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
      const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},imported,data);
      const form=new FormData();form.append('file',new File([encrypted],'mapa-'+crypto.randomUUID()+'.bin',{type:'application/octet-stream'}));
      const result=await this.request('/integration-endpoints/Core/UploadPrivateFile',{method:'POST',body:form});
      return validateRef({file_uri:result.file_uri,key:b64(key),iv:b64(iv),hash});
    }
    async download(rawRef,max=22000000){
      const ref=validateRef(rawRef),result=await this.request('/integration-endpoints/Core/CreateFileSignedUrl',{method:'POST',body:{file_uri:ref.file_uri,expires_in:300}});
      if(typeof result.signed_url!=='string'||new URL(result.signed_url).protocol!=='https:')throw Error('L’enllaç privat no és vàlid.');
      const r=await this.fetcher(result.signed_url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(60000)});
      if(!r.ok)throw Error('No s’ha pogut recuperar un document del compte.');
      if(Number(r.headers.get('content-length'))>max)throw Error('El document del compte és massa gran.');
      const data=await r.arrayBuffer();if(data.byteLength>max)throw Error('El document del compte és massa gran.');
      const key=await crypto.subtle.importKey('raw',bytes(ref.key),'AES-GCM',false,['decrypt']);
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(ref.iv)},key,data);
      if(await digest(plain)!==ref.hash)throw Error('El document del compte està malmès.');return plain;
    }
  }
  root.MapaAccountCore={AccountStore,digest,b64,bytes,validateRef,APP};
})(globalThis);
