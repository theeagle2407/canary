// Read-only JSON-RPC transport. No automatic retries for writes (writes are forbidden here).
const allowed=new Set(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_getLogs']);
export async function rpcRead(url,method,params,{signal,fetcher=globalThis.fetch,timeout=6000,retries=1}={}){
 if(!allowed.has(method))throw Error('Read-only RPC methods only');
 for(let attempt=0;;attempt++){
  if(signal?.aborted)throw Error(method+': cancelled');
  try{
   const deadline=AbortSignal.timeout(timeout),combined=signal?AbortSignal.any([signal,deadline]):deadline;
   const res=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:combined,cache:'no-store'});
   if(!res.ok){const e=Error('HTTP '+res.status);e.retryable=[429,502,503,504].includes(res.status);throw e}
   const value=await res.json();if(value?.jsonrpc!=='2.0'||value.id!==1)throw Error('Invalid RPC response');
   if(value.error){const e=Error('RPC '+value.error.code+': '+String(value.error.message||'error'));e.retryable=[-32005,-32016].includes(value.error.code);throw e}
   if(!Object.hasOwn(value,'result'))throw Error('Missing RPC result');return value.result;
  }catch(e){if(signal?.aborted||attempt>=retries||!(e.retryable||e.name==='TimeoutError'||e.name==='AbortError'||e instanceof TypeError))throw Error(method+': '+e.message);}
 }
}
export async function mapLimited(values,fn,limit=2){const out=new Array(values.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,values.length)},async()=>{for(;;){const i=next++;if(i>=values.length)return;out[i]=await fn(values[i],i)}}));return out;}
export function historyKey(cfg,active,rows){return JSON.stringify([cfg.chainId,cfg.registry,active.id,rows.map(r=>[r.id,String(r.runs),String(r.checkedBlock)])]);}
