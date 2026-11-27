const valid=p=>p&&typeof p.request==='function';
function legacyName(p){if(p.isRabby)return 'Rabby';if(p.isCoinbaseWallet)return 'Coinbase Wallet';if(p.isTrust||p.isTrustWallet)return 'Trust Wallet';if(p.isOKXWallet||p.isOkxWallet)return 'OKX Wallet';if(p.isBraveWallet)return 'Brave Wallet';if(p.isMetaMask)return 'MetaMask';return 'Browser wallet';}
// Only list actual providers; announced names are display metadata, not identity proofs.
export function createWalletDiscovery(browser,onChange){
  const announced=new Map(), ids=new Map();let next=0;
  function id(p){if(!ids.has(p))ids.set(p,++next);return ids.get(p);}
  function refresh(){
    const rows=new Map(announced), injected=browser.ethereum;
    const legacy=Array.isArray(injected?.providers)&&injected.providers.length?injected.providers:[injected];
    for(const p of legacy)if(valid(p)&&!rows.has(p))rows.set(p,{id:id(p),name:legacyName(p),provider:p});
    onChange([...rows.values()]);
  }
  function announce(e){const p=e.detail?.provider,n=e.detail?.info?.name;if(!valid(p)||typeof n!=='string'||!n.trim())return;announced.set(p,{id:id(p),name:n.trim().slice(0,80),provider:p});refresh();}
  function request(){refresh();browser.dispatchEvent(new Event('eip6963:requestProvider'));}
  browser.addEventListener('eip6963:announceProvider',announce);browser.addEventListener('ethereum#initialized',request);request();
  return {request,stop(){browser.removeEventListener('eip6963:announceProvider',announce);browser.removeEventListener('ethereum#initialized',request);}};
}
export async function authorizeWallet(raw,cfg,makeProvider,normalize){
  if(!valid(raw))throw Error('Wallet is unavailable.');
  const requested=await raw.request({method:'eth_requestAccounts'});
  if(!Array.isArray(requested)||!requested.length)throw Error('No wallet account authorized.');
  const hex='0x'+cfg.chainId.toString(16);
  if(BigInt(await raw.request({method:'eth_chainId'}))!==BigInt(cfg.chainId)){
    try{await raw.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]});}
    catch(e){if(Number(e.code)!==4902&&Number(e.data?.originalError?.code)!==4902)throw e;await raw.request({method:'wallet_addEthereumChain',params:[{chainId:hex,chainName:cfg.name,rpcUrls:[cfg.rpc],nativeCurrency:{name:'QIE',symbol:'QIE',decimals:18},blockExplorerUrls:[cfg.explorer]}]});await raw.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]});}
  }
  const accounts=await raw.request({method:'eth_accounts'});
  if(!accounts?.length)throw Error('No wallet account authorized.');
  const address=normalize(accounts[0]);
  const bp=makeProvider(raw);
  if(BigInt(await raw.request({method:'eth_chainId'}))!==BigInt(cfg.chainId))throw Error('Wallet network mismatch.');
  if(await bp.getCode(cfg.registry)==='0x')throw Error('Registry not found through wallet RPC. Select the official QIE RPC.');
  const signer=await bp.getSigner(address);
  if(normalize(await signer.getAddress())!==address)throw Error('Wallet account changed. Reconnect.');
  const finalAccounts=await raw.request({method:'eth_accounts'});
  if(!finalAccounts?.length||normalize(finalAccounts[0])!==address||BigInt(await raw.request({method:'eth_chainId'}))!==BigInt(cfg.chainId))throw Error('Wallet account or network changed. Reconnect.');
  return {signer,address};
}
