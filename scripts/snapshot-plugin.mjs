import {readFile} from 'node:fs/promises';
import {fetchSnapshot} from '../src/lib/snapshot.mjs';
import {readEndpoints} from '../src/lib/read-failover.mjs';
import {orderEndpoints,snapshotRequest} from '../src/lib/snapshot-policy.mjs';
export function canarySnapshotPlugin(){
 let preferred='',scope='',active=0;const pending=new Map();
 return {name:'canary-local-snapshot',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  let q;try{q=snapshotRequest(req.url||'/')}catch{res.statusCode=400;return res.end('Invalid project ID')};if(!q)return next();
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.statusCode=405;return res.end('{"error":"METHOD_NOT_ALLOWED"}')}
  try{
   const cfg=JSON.parse(await readFile(new URL('../src/deployment.json',import.meta.url),'utf8'));
   if(!/^0x[0-9a-f]{40}$/i.test(cfg.registry))throw Error('Registry not configured');
   const key=JSON.stringify([cfg.chainId,cfg.registry,cfg.rpc,q.sel,q.pub,q.owner||'',q.pinned||[]]);const nextScope=JSON.stringify([cfg.chainId,cfg.registry,cfg.rpc]);if(scope!==nextScope){scope=nextScope;preferred=''}
   let task=pending.get(key);if(!task){if(active>=3){res.statusCode=503;return res.end('{"error":"Snapshot service busy; retrying"}')};active++;task=fetchSnapshot(cfg,q.sel,q.pub||null,orderEndpoints(readEndpoints(cfg),preferred),q.owner||null,q.pinned||[]).then(v=>{if(scope===nextScope)preferred=v.endpoint;return v}).finally(()=>{active--;pending.delete(key)});pending.set(key,task)}
   const value=await task;res.end(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v));
  }catch(e){console.warn('[CANARY snapshot]',new Date().toISOString(),e.shortMessage||e.message);res.statusCode=503;res.end(JSON.stringify({error:e.shortMessage||e.message||'Snapshot unavailable'}))}/* CANARY_RPC_EFFICIENCY_V1 */
 })}};
}
