import {readFile,writeFile} from 'node:fs/promises';
import {replacements,cleanLabel} from './ui-network-labels.mjs';
const root=new URL('../',import.meta.url);
const edits=[];
for(const [file,before,after] of replacements){
 const path=new URL(file,root),source=await readFile(path,'utf8');
 const next=cleanLabel(source,before,after);
 edits.push({path,source,next,file});
}
for(const {path,source,next,file} of edits){if(next!==source){await writeFile(path,next);console.log('Updated',file);}else console.log('Already clean',file);}
console.log('Presentation labels only. Deployment identity unchanged. Rebuild before restarting.');
