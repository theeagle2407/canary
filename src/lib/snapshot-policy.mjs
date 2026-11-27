export function bounded(p,ms){let t;return Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(Error('Optional RPC read timed out')),ms)})]).finally(()=>clearTimeout(t));}
export function orderEndpoints(endpoints,preferred){return [...new Set([...(endpoints.includes(preferred)?[preferred]:[]),...endpoints])];}
// A completion schedules the next attempt; a slow read cannot starve the UI through overlapping interval ticks.
export function startPolling(read,{normal=15000,retry=5000,schedule=setTimeout,cancel=clearTimeout}={}){
 let stopped=false,timer;
 async function tick(){let ok=false;try{ok=await read()}catch{}if(!stopped)timer=schedule(tick,ok?normal:retry);}
 void tick();return()=>{stopped=true;cancel(timer)};
}
export function snapshotRequest(url){const u=new URL(url,'http://localhost');if(u.pathname!=='/__canary/snapshot')return null;const sel=u.searchParams.get('selected')||'',pub=u.searchParams.get('publicId')||'';if([sel,pub].some(v=>v&&(!/^[1-9][0-9]{0,77}$/.test(v)||BigInt(v)>=2n**256n)))throw Error('Invalid project ID');const owner=u.searchParams.get('owner')||'',raw=u.searchParams.get('pinned')||'',pinned=raw?raw.split(','):[];if(owner&&!/^0x[0-9a-f]{40}$/i.test(owner))throw Error('Invalid owner');if(pinned.length>10||pinned.some(v=>!(/^[1-9][0-9]{0,77}$/).test(v)||BigInt(v)>=2n**256n))throw Error('Invalid pinned project IDs');return owner||raw?{sel,pub,owner:owner.toLowerCase(),pinned:[...new Set(pinned)]}:{sel,pub};}
