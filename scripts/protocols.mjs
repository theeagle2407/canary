import {scan,rpcClient} from './qie-preflight.mjs';
import {scanDex} from './qiedex-preflight.mjs';
export const ENDPOINTS=[1,2,3,4,5].map(i=>`https://rpc${i}mainnet.qie.digital`);
// Only fixed official hosts; no user supplied RPC endpoints or arbitrary calls.
export async function observe(run, endpoints=ENDPOINTS.slice(0,2), makeRpc=rpcClient){
 for(const endpoint of endpoints){try{const value=await run(makeRpc(endpoint));if(value.chainId!==1990||!value.block?.hash)throw Error('Invalid snapshot');return {state:'observed',endpoint,observedAt:new Date().toISOString(),value};}catch{}}
 return {state:'unavailable',observedAt:new Date().toISOString(),value:null};
}
export function createProtocolReader({tokenScan=scan,dexScan=scanDex,read=observe,ttl=60000}={}){
 let cache=null,at=0,inflight;
 return async()=>{if(cache&&Date.now()-at<ttl)return cache;if(!inflight)inflight=Promise.all([read(tokenScan),read(dexScan)]).then(([tokens,dex])=>{cache={chainId:1990,kind:'read-only-mainnet-observations',tokens,dex};at=Date.now();return cache}).finally(()=>{inflight=null});return inflight};
}
