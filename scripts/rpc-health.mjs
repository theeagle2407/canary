// CANARY_MAINNET_ACTIVATION_V1
export const ENDPOINTS = Array.from({length:6},(_,i)=>`https://rpc${i+1}testnet.qie.digital`);
export const POLL_MS=45000;
export function classify(row,head,now=Date.now()){
 if(!row.ok)return row.state;
 if(Math.abs(now/1000-row.blockTime)>120 || head-row.block>5)return 'degraded';
 return 'healthy';
}
export async function probe(url,registry,{request=fetch,chainId=1983,now=Date.now}={}){
 const started=now();let id=0;
 async function rpc(method,params=[]){const n=++id;const response=await request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:n,method,params}),signal:AbortSignal.timeout(6500)});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();if(data.id!==n||data.error||data.result==null)throw Error('Invalid RPC response');return data.result;}
 try{
  if(BigInt(await rpc('eth_chainId'))!==BigInt(chainId))return {url,ok:false,state:'wrong-chain',error:'Chain ID mismatch',latencyMs:now()-started};
  const b=await rpc('eth_getBlockByNumber',['latest',false]);const block=Number(BigInt(b.number)),blockTime=Number(BigInt(b.timestamp));if(!Number.isSafeInteger(block)||!Number.isSafeInteger(blockTime))throw Error('Invalid block');
  const code=await rpc('eth_getCode',[registry,b.number]);if(!/^0x(?:[a-f\d]{2})+$/i.test(code))return {url,ok:false,state:'registry-missing',error:'Registry code not found',latencyMs:now()-started};
  return {url,ok:true,block,blockTime,latencyMs:now()-started};
 }catch(e){return {url,ok:false,state:'unavailable',error:String(e.message||e).slice(0,160),latencyMs:now()-started};}
}
export function summarize(rows,now=Date.now()){
 const valid=rows.filter(r=>r.ok&&Math.abs(now/1000-r.blockTime)<=120);const head=valid.length?Math.max(...valid.map(r=>r.block)):null;
 return rows.map(r=>({...r,state:classify(r,head??r.block,now),lag:r.ok&&head!==null?Math.max(0,head-r.block):null,at:new Date(now).toISOString()}));
}
export function heartbeatState(h,registry,now=Date.now(),chainId=1983){
 if(!h||h.registry!==registry.toLowerCase()||h.chainId!==chainId)return {state:'unknown'};
 const age=now-Date.parse(h.lastScanAt||'');const recent=Number.isFinite(age)&&age>=0&&age<=90000;
 return {state:h.state==='stopped'?'stopped':!recent?'stale':h.state==='degraded'?'degraded':'active',lastScanAt:h.lastScanAt||null,lastEventAt:h.lastEventAt||null,block:h.block??null,registered:h.registered??null,signer:h.signer||null};
}
