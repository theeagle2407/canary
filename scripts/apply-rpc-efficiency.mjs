import {readFileSync,writeFileSync} from 'node:fs';
const f=new URL('../src/main.jsx',import.meta.url),p=new URL('./snapshot-plugin.mjs',import.meta.url);
let s=readFileSync(f,'utf8'),v=readFileSync(p,'utf8');
if(!s.includes('CANARY_SNAPSHOT_RECOVERY_V2'))throw Error('Build 12.2 required');
if(!s.includes('CANARY_RPC_EFFICIENCY_V1')){
 const old='if(token===req.current){setReadFailed(true);setLiveResults({});}return false;';
 if(!s.includes(old))throw Error('Unexpected snapshot handler');
 s=s.replace(old,"if(token===req.current){console.warn('[CANARY snapshot]',e.message);setReadFailed(true);setLiveResults({});}return false;/* CANARY_RPC_EFFICIENCY_V1 */");
 s=s.replace("normal:cfg.mode==='local'?5000:15000,retry:5000","normal:cfg.mode==='local'?5000:20000,retry:10000");
 // A history-only error is not a transaction success notification.
 s=s.replace("if(historyUnavailable)setNote('History RPC unavailable. Latest check records are still shown.');","if(historyUnavailable)setNote('History RPC unavailable. Latest check records are still shown.');else setNote(n=>n==='History RPC unavailable. Latest check records are still shown.'?'':n);");
}
if(!v.includes('CANARY_RPC_EFFICIENCY_V1')){
 const old="}catch(e){res.statusCode=503;res.end(JSON.stringify({error:e.shortMessage||e.message||'Snapshot unavailable'}))}";
 if(!v.includes(old))throw Error('Unexpected snapshot middleware');
 v=v.replace(old,"}catch(e){console.warn('[CANARY snapshot]',new Date().toISOString(),e.shortMessage||e.message);res.statusCode=503;res.end(JSON.stringify({error:e.shortMessage||e.message||'Snapshot unavailable'}))}/* CANARY_RPC_EFFICIENCY_V1 */");
}
writeFileSync(f,s);writeFileSync(p,v);console.log('RPC efficiency installed; restart Vite.');
