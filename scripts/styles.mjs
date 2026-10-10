import {compile} from 'sass';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const result=compile(resolve(root,'assets/scss/styles.scss'),{
  style:'expanded',
  sourceMap:false
});
await mkdir(resolve(root,'assets/css'),{recursive:true});
await writeFile(resolve(root,'assets/css/styles.css'),result.css+'\n');
console.log('SCSS compiled to assets/css/styles.css.');
