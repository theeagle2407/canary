// Read-only operations may be retried; never put a transaction submission here.
export function isTransient(e) {
  const message = [e?.shortMessage,e?.message,e?.code,e?.info?.responseStatus,e?.cause?.message].filter(Boolean).join(' ');
  return /\b(429|500|502|503|504|TIMEOUT|NETWORK_ERROR|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT)\b|temporarily unavailable|timeout|socket hang up|failed to fetch|network connection|latest block not fresh/i.test(message);
}
export function createReadFailover(endpoints,{open,close=()=>{},onFailure=()=>{},sleep=async()=>{},rounds=2}={}) {
  let current=null, preferred=0;
  async function read(operation) {
    let last;
    for(let round=0;round<rounds;round++) {
      const start=preferred;
      for(let step=0;step<endpoints.length;step++) {
        const index=(start+step)%endpoints.length, url=endpoints[index];
        try {
          if(!current||current.url!==url) { if(current) {close(current.value);current=null;} current={url,value:await open(url)}; }
          const result=await operation(current.value,url);
          preferred=index;
          return {result,connection:current.value,url};
        } catch(e) {
          last=e; onFailure(url,e);
          if(current) {close(current.value);current=null;}
          if(!isTransient(e)&&!e?.endpointRejected) throw e;
        }
      }
      if(round+1<rounds) await sleep(1000*(round+1));
    }
    throw last||Error('No RPC endpoints');
  }
  return {read,close(){if(current){close(current.value);current=null;}}};
}
