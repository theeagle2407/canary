// CANARY_MAINNET_ACTIVATION_V1
// Retry whole read-only snapshots, never signed transactions.
export function readEndpoints(config){
  return [...new Set([config.rpc,...(config.mode==='mainnet'&&Number(config.chainId)===1990&&config.rpc==='https://rpc1mainnet.qie.digital'?["https://rpc2mainnet.qie.digital"]:[]),...(config.mode==='testnet'&&Number(config.chainId)===1983?['https://rpc4testnet.qie.digital','https://rpc5testnet.qie.digital']:[])])];
}
export async function readWithFailover(endpoints,read,{timeout=12000}={}){
  let last;
  for(const endpoint of endpoints){
    let timer;
    const controller=new AbortController();
    try {
      return await Promise.race([Promise.resolve().then(()=>read(endpoint,controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('RPC read timeout'));},timeout)})]);
    }catch(error){last=error;}
    finally{clearTimeout(timer);}
  }
  throw Error('Network data unavailable: '+(last?.shortMessage||last?.message||'no RPC endpoints'));
}
