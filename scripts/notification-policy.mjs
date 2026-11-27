import {createHmac,timingSafeEqual} from 'node:crypto';
export const initialState=(identity,start)=>({version:1,identity,cursor:start,checkpoint:null,checks:{},outbox:[],lastScanAt:null});
export function ingest(state,events,next,checkpoint,now=Date.now()){
 const s=structuredClone(state);
 for(const e of [...events].sort((a,b)=>a.block-b.block||a.index-b.index)){
  if(e.block<state.cursor||e.block>=next)throw Error('Event outside scan window');
  if(!['pass','fail','error','retired'].includes(e.status))throw Error('Invalid event status');
  const key=String(e.checkId), previous=s.checks[key]||'unknown';
  s.checks[key]=e.status;
  const bad=x=>x==='fail'||x==='error';
  const kind=bad(e.status)&&!bad(previous)?'check.failed':e.status==='pass'&&bad(previous)?'check.recovered':e.status==='retired'&&bad(previous)?'check.retired':null;
  if(!kind)continue;
  const id=`${s.identity.chainId}:${s.identity.registry}:${e.tx}:${e.index}`;
  if(s.outbox.some(x=>x.id===id))continue;
  s.outbox.push({id,kind,chainId:s.identity.chainId,registry:s.identity.registry,projectId:String(e.projectId),checkId:key,previous,status:e.status,observed:e.observed??null,block:e.block,transactionHash:e.tx,recordedAt:e.time??null,state:'pending',attempts:0,nextAt:now,deliveredAt:null});
 }
 if(s.outbox.length>5000)throw Error('Outbox limit reached; export/archive before continuing');
 s.cursor=next;s.checkpoint=checkpoint;s.lastScanAt=new Date(now).toISOString();return s;
}
export function due(s,now=Date.now()){return s.outbox.find(x=>x.state==='pending'&&x.nextAt<=now);}
export function settle(s,id,ok,now=Date.now()){
 const n=structuredClone(s),e=n.outbox.find(x=>x.id===id);if(!e||e.state!=='pending')throw Error('Unknown pending event');
 e.attempts++;e.state=ok?'delivered':e.attempts>=8?'failed':'pending';e.deliveredAt=ok?new Date(now).toISOString():null;e.nextAt=now+Math.min(300000,5000*2**(e.attempts-1));return n;
}
export const signature=(secret,body)=>'sha256='+createHmac('sha256',secret).update(body).digest('hex');
export function verify(secret,body,sig){const a=Buffer.from(signature(secret,body)),b=Buffer.from(String(sig||''));return a.length===b.length&&timingSafeEqual(a,b);}
export function payload(e){const {state,attempts,nextAt,deliveredAt,...body}=e;return body;}
export async function deliver(url,secret,e){const body=JSON.stringify(payload(e));const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Canary-Signature':signature(secret,body),'Idempotency-Key':e.id},body,redirect:'error',signal:AbortSignal.timeout(8000)});await r.body?.cancel();return r.ok;}
