import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {compile} from 'sass';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFile(resolve(root,path),'utf8');
const compiled=compile(resolve(root,'assets/scss/styles.scss'),{style:'expanded',sourceMap:false}).css+'\n';
assert.equal(await read('assets/css/styles.css'),compiled,'CSS must match the SCSS source; run npm run styles');
async function walk(path){const out=[];for(const item of await readdir(resolve(root,path))){const p=path+'/'+item;if((await stat(resolve(root,p))).isDirectory())out.push(...await walk(p));else out.push(p)}return out}
const scripts=await walk('assets/js');
for(const path of scripts)new vm.Script(await read(path),{filename:path});
for(const path of ['scripts/build.mjs','scripts/styles.mjs','netlify/functions/jobs-feed.mjs']){
  const result=spawnSync(process.execPath,['--check',resolve(root,path)],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}
const html=await read('index.html');
assert(!/<style\b/i.test(html),'Styles should be external');
for(const [,path] of html.matchAll(/(?:src|href)="((?:assets\/)[^"]+)"/g))assert((await stat(resolve(root,path))).isFile(),'Missing asset '+path);
const centres=JSON.parse(await read('assets/data/centres.json'));
const entitats=JSON.parse(await read('assets/data/entitats.json'));
assert.equal(centres.length,3745);assert.equal(entitats.infantil.length,18);assert.equal(entitats.lleure.length,64);
assert.equal(new Set(centres.map(x=>x.id)).size,centres.length,'Duplicate school IDs');
const allowedSchoolFields=new Set(['id','name','city','county','age','kind','lat','lng','email','phone','address','postal']);
for(const centre of centres)for(const key of Object.keys(centre))assert(allowedSchoolFields.has(key),'Unexpected personal field '+key);
const sandbox={window:{}};vm.runInNewContext(await read('assets/data/dades-local.js'),sandbox);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.MAPA_DATA)),{centres,entitats},'Generated file must match JSON');
const files=['index.html','README.md','netlify.toml','package.json','pnpm-lock.yaml','.gitignore',...scripts,...await walk('assets/css'),...await walk('assets/scss'),...await walk('assets/data'),...await walk('netlify/functions'),...await walk('scripts')];
const secrets=[/gh[pousr]_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/AIza[0-9A-Za-z_-]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/ya29\.[A-Za-z0-9_-]{20,}/,/["']client_secret["']\s*:\s*["'][^"']+/,/(?:Diana)\s+(?:Carbonell)/,/2026-07-1[4567]T12:00:00/];
for(const path of files){const text=await read(path);for(const pattern of secrets)assert(!pattern.test(text),'Potential secret or private application data in '+path)}
const published=await walk('public');
assert(published.every(p=>p==='public/index.html'||['css','js','data'].some(folder=>p.startsWith('public/assets/'+folder+'/'))),'Private file in public directory');
console.log('PASS: syntax, local routes, 3745 centres, 82 entities, JSON/file preview parity, privacy scan and publication allowlist.');
