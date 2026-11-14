import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8')).split('(async function(){')[0];
function setup(failRemote=false){const requests=[];const context={window:{},location:{hostname:'el-meu-mapa-escoles.dolca1021.chatgpt.site'},AbortSignal,fetch:async(url,options)=>{requests.push({url,options});if(failRemote&&url.startsWith('https:'))throw Error('offline');return {ok:true,json:async()=>({jobs:[]})}}};vm.createContext(context);vm.runInContext(source,context);return {...context,requests};}
test('Sites reads the scheduled public feed without account credentials',async()=>{const x=setup();await x.window.mapaPublicData('ofertes.json');assert.equal(x.requests[0].url,'https://dcarbonellcas-cmyk.github.io/el-meu-mapa/assets/data/ofertes.json');assert.equal(x.requests[0].options.credentials,'omit');await assert.rejects(x.window.mapaPublicData('../private.json'));assert.equal(x.requests.length,1);});
test('Sites retains its bundled public data if the daily feed is unavailable',async()=>{const x=setup(true);await x.window.mapaPublicData('ofertes.json');assert.equal(x.requests[1].url,'assets/data/ofertes.json');});
