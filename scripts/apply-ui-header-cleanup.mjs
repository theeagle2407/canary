import {readFile,writeFile} from 'node:fs/promises';
import {edits,applyEdits} from './ui-header-cleanup.mjs';
const root=new URL('../',import.meta.url);
const plan=await Promise.all(Object.keys(edits).map(async file=>{const path=new URL(file,root);const old=await readFile(path,'utf8');return {file,path,old,next:applyEdits(file,old)};}));
for(const {file,path,old,next} of plan){if(old!==next){await writeFile(path,next);console.log('Updated',file);}else console.log('Already updated',file);}
console.log('UI cleanup complete. Deployment and worker settings untouched.');
