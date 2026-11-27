import {randomUUID} from 'node:crypto';
import {readFile,open,rename} from 'node:fs/promises';
export const kinds=['check.failed','check.recovered','check.retired'];
export const defaults=()=>({enabled:true,kinds:[...kinds]});
export function validateSettings(x){if(!x||typeof x.enabled!=='boolean'||!Array.isArray(x.kinds)||x.kinds.some(k=>!kinds.includes(k))||new Set(x.kinds).size!==x.kinds.length)throw Error('Invalid notification settings');return {enabled:x.enabled,kinds:[...x.kinds]};}
export const origins=new Set(['http://127.0.0.1:5173','http://localhost:5173']);
export function allowedWrite(req){return origins.has(req.headers.origin)&&['127.0.0.1:8790','localhost:8790'].includes(req.headers.host)&&req.headers['content-type']?.split(';')[0].trim()==='application/json';}
export async function loadSettings(path){try{return validateSettings(JSON.parse(await readFile(path,'utf8')))}catch(e){if(e.code==='ENOENT')return defaults();throw e}}
export async function persistSettings(path,x){const value=validateSettings(x),tmp=new URL(path.href+'.tmp');const f=await open(tmp,'w',0o600);try{await f.writeFile(JSON.stringify(value));await f.sync()}finally{await f.close()}await rename(tmp,path);return value;}
export function suppress(s,settings){let changed=false;const outbox=s.outbox.map(e=>{if(e.state==='pending'&&(!settings.enabled||!settings.kinds.includes(e.kind))){changed=true;return {...e,state:'suppressed'}}return e});return changed?{...s,outbox}:s;}
export function testEvent(identity){return {id:'test:'+randomUUID(),kind:'notification.test',chainId:identity.chainId,registry:identity.registry,projectId:identity.project,checkId:null,transactionHash:null,block:null,recordedAt:null,test:true};}
export async function readSmallJson(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>4096)throw Error('Request too large');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
