const site = 'https://dcarbonellcas-cmyk.github.io/el-meu-mapa/';
const origin = new URL(site).origin;
const callback = 'https://el-meu-mapa-sync.dcarbonellcas.workers.dev/callback';
const scope = 'https://www.googleapis.com/auth/drive.appdata';
const sessionLength = 180 * 86400_000;
const proofPattern = /^[A-Za-z0-9_-]{43}$/;
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
const bytes = value => new TextEncoder().encode(value);
const associatedData = bytes(site + 'private-sync-v1');

function json(body, status = 200) {
  return Response.json(body, {status, headers:{
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  }});
}

async function exchange(env, parameters) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({...parameters, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET}),
    redirect: 'error'
  });
  return response.json();
}

async function seal(key, refreshToken, expires) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:associatedData},key,bytes(JSON.stringify({refreshToken,expires})));
  return encode(iv) + '.' + encode(new Uint8Array(ciphertext));
}

async function open(key, session) {
  if(typeof session!=='string'||session.length>4096||!/^[-\w]{16}\.[-\w]+$/.test(session))return null;
  try {
    const [iv,ciphertext]=session.split('.').map(decode);
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:associatedData},key,ciphertext);
    const data=JSON.parse(new TextDecoder().decode(plaintext));
    return Date.now()<data.expires ? data : null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/callback') {
      const result = new URLSearchParams();
      for (const name of ['code', 'state', 'error']) {
        const value = url.searchParams.get(name);
        if (value && value.length <= 2048) result.set('drive_' + name, value);
      }
      return new Response(null,{status:303,headers:{
        Location: site + '#' + result, 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer'
      }});
    }
    if (request.headers.get('Origin') !== origin) return json({error:'forbidden'},403);
    if (request.method === 'OPTIONS') return json({});
    if (request.method !== 'POST' || !['/start','/exchange','/refresh'].includes(url.pathname)) return json({error:'not_found'},404);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_ACCOUNT) {
      return json({error:'unconfigured'},503);
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'bad_request'},400);
    let data;
    try {
      const raw = await request.text();
      if (raw.length > 8192) return json({error:'bad_request'},400);
      data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return json({error:'bad_request'},400);
    } catch {
      return json({error:'bad_request'},400);
    }
    try {
      if (url.pathname === '/start') {
        if (!proofPattern.test(data.state) || !proofPattern.test(data.challenge)) return json({error:'bad_request'},400);
        const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authorization.search = new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID, redirect_uri:callback, response_type:'code',
          scope:'openid email ' + scope, access_type:'offline', prompt:'consent',
          state:data.state, code_challenge:data.challenge, code_challenge_method:'S256'
        });
        return json({authorization:authorization.href});
      }
      const material = await crypto.subtle.importKey('raw',bytes(env.GOOGLE_CLIENT_SECRET),'HKDF',false,['deriveKey']);
      const key = await crypto.subtle.deriveKey({
        name:'HKDF',hash:'SHA-256',salt:bytes(site),info:bytes('private-sync-v1')
      },material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
      if (url.pathname === '/exchange') {
        if (typeof data.code!=='string'||!data.code||data.code.length>2048||!proofPattern.test(data.verifier)) return json({error:'bad_request'},400);
        const tokens = await exchange(env,{grant_type:'authorization_code',code:data.code,code_verifier:data.verifier,redirect_uri:callback});
        if (!tokens.access_token || !tokens.refresh_token || !tokens.scope?.split(' ').includes(scope)) return json({error:'authorization_required'},401);
        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo',{
          headers:{Authorization:'Bearer '+tokens.access_token},redirect:'error'
        });
        const profile=await profileResponse.json();
        if (!profileResponse.ok || profile.email_verified !== true || profile.email?.toLowerCase() !== env.GOOGLE_ACCOUNT.toLowerCase()) return json({error:'wrong_account'},403);
        const session = await seal(key,tokens.refresh_token,Date.now()+sessionLength);
        return json({session, accessToken:tokens.access_token, expiresIn:tokens.expires_in});
      }
      const session = await open(key,data.session);
      if (!session) return json({error:'authorization_required'},401);
      const tokens = await exchange(env,{grant_type:'refresh_token',refresh_token:session.refreshToken});
      if (tokens.error === 'invalid_grant') return json({error:'authorization_required'},401);
      if (!tokens.access_token) return json({error:'google_unavailable'},502);
      const rotated = tokens.refresh_token ? await seal(key,tokens.refresh_token,session.expires) : undefined;
      return json({session:rotated, accessToken:tokens.access_token, expiresIn:tokens.expires_in});
    } catch {
      return json({error:'temporarily_unavailable'},502);
    }
  }
};
