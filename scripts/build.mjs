import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const centres=JSON.parse(await readFile(resolve(root,'assets/data/centres.json'),'utf8'));
const entitats=JSON.parse(await readFile(resolve(root,'assets/data/entitats.json'),'utf8'));
await writeFile(resolve(root,'assets/data/dades-local.js'),'// Generated from centres.json and entitats.json by scripts/build.mjs.\nwindow.MAPA_DATA='+JSON.stringify({centres,entitats})+';\n');
// Explicit allowlist: private history, credentials and backups are never copied.
await mkdir(resolve(root,'public'),{recursive:true});
await cp(resolve(root,'index.html'),resolve(root,'public/index.html'));
await cp(resolve(root,'assets'),resolve(root,'public/assets'),{recursive:true});
console.log('Prepared public site: '+centres.length+' centres; private files excluded.');
