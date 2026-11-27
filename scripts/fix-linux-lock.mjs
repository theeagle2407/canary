import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from "node:url";
export function normalizeGanacheLock(lock){
 if(!lock.packages||lock.lockfileVersion<2)throw Error('Expected npm lockfile with packages map');
 const changes=[];for(const [path,p] of Object.entries(lock.packages)){
  if(!/(^|\/)node_modules\/ganache\/node_modules\/fsevents$/.test(path))continue;
  if(p.version!=='2.3.2'||!Array.isArray(p.os)||p.os.length!==1||p.os[0]!=='darwin')throw Error('Unexpected Ganache fsevents record; inspect lockfile manually');
  if(p.optional!==true){p.optional=true;changes.push(path);}
 }
 return changes;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){const path=new URL('../package-lock.json',import.meta.url),backup=new URL('../package-lock.json.before-linux-fix',import.meta.url);const raw=readFileSync(path,'utf8'),lock=JSON.parse(raw),changes=normalizeGanacheLock(lock);if(changes.length){if(!existsSync(backup))writeFileSync(backup,raw);writeFileSync(path,JSON.stringify(lock,null,2)+'\n');console.log('Marked macOS-only Ganache fsevents optional:',changes.join(', '));}else console.log('No matching nonoptional Ganache fsevents record found. No lockfile changes.');}
