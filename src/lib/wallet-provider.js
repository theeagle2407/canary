export async function findMetaMask(browser=window, waitMs=300){
  const found=new Map();
  const announce=event=>{
    const detail=event.detail;
    if(detail?.info?.rdns==='io.metamask' && detail.provider?.request) found.set(detail.provider,detail);
  };
  browser.addEventListener('eip6963:announceProvider',announce);
  try{
    browser.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise(resolve=>setTimeout(resolve,waitMs));
  }finally{browser.removeEventListener('eip6963:announceProvider',announce)}
  if(found.size===1)return found.keys().next().value;
  if(found.size>1)throw Error('Multiple MetaMask providers found. Disable duplicate wallet extensions and reconnect.');
  const injected=browser.ethereum;
  const candidates=[...new Set((Array.isArray(injected?.providers)?injected.providers:[injected]).filter(p=>p?.isMetaMask&&p?.request))];
  if(candidates.length===1)return candidates[0];
  throw Error('MetaMask could not be uniquely identified. Enable MetaMask and temporarily disable competing wallet extensions.');
}
