// CANARY_MAINNET_ACTIVATION_V1
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
export function createHeartbeat(registry,signer,{dir=new URL('../.canary-keeper/',import.meta.url),chainId=1983,now=()=>new Date().toISOString()}={}){
 const path=new URL('heartbeat.json',dir);let h={chainId,registry:registry.toLowerCase(),signer,state:'starting',lastScanAt:null};let warned=false;
 return message=>{
  const scan=/^SCAN \| block=(\d+) \| registered=(\d+)/.exec(message);
  if(scan)h={...h,state:'active',lastScanAt:now(),block:Number(scan[1]),registered:Number(scan[2])};
  else if(message.startsWith('SCAN UNAVAILABLE')||message.startsWith('RPC READ FAILED'))h.state='degraded';
  else if(message.startsWith('STOPPED')||message.startsWith('WRITE FAILED'))h.state='stopped';
  else if(!message.startsWith('KEEPER START'))return;
  h.lastEventAt=now();try{mkdirSync(dir,{recursive:true,mode:0o700});const tmp=new URL('heartbeat.json.tmp',dir);writeFileSync(tmp,JSON.stringify(h),{mode:0o600});renameSync(tmp,path)}catch(e){if(!warned){console.warn('Heartbeat unavailable:',e.code||'IO_ERROR');warned=true;}}
 };
}
