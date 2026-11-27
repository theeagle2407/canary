import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
export const TARGETS={QUSDC:'0x3f43da82ec9a4f5285f10faf1f26eca7319e5da5',WQIE:'0x0087904d95bee9e5f24dc8852804b547981a9139'};
export const RPC='https://rpc1mainnet.qie.digital';
export function word(value){if(typeof value!=='string'||!/^0x[0-9a-f]{64}$/i.test(value))throw Error('Expected exactly one ABI word');return BigInt(value);}
export function quantity(value){if(typeof value!=='string'||!/^0x[0-9a-f]+$/i.test(value))throw Error('Invalid RPC quantity');return BigInt(value);}
export function coverage(balance,supply,decimals){if(decimals!==18n||supply<=0n)return 'unverified';return balance>=supply?'passed':'failed';}
export function rpcClient(url=RPC){let id=0;return async(method,params=[])=>{const requestId=++id;const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:requestId,method,params}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.id!==requestId||j.error||!Object.hasOwn(j,'result'))throw Error(j.error?.message||'Invalid RPC reply');return j.result;};}
export async function scan(rpc){const chainId=quantity(await rpc('eth_chainId'));if(chainId!==1990n)throw Error('Wrong chain: expected QIE mainnet 1990');const block=await rpc('eth_getBlockByNumber',['latest',false]);if(!block?.hash||!block.number)throw Error('No block');const tag=block.number;const timestamp=Number(quantity(block.timestamp));if(!Number.isSafeInteger(timestamp)||Math.abs(Date.now()/1000-timestamp)>300)throw Error('RPC block timestamp outside 5 minute freshness window');const tokens={};const plan=[];
for(const [name,address] of Object.entries(TARGETS)){
 const row={address,codePresent:false};tokens[name]=row;
 const code=await rpc('eth_getCode',[address,tag]);if(typeof code!=='string'||!/^0x(?:[0-9a-f]{2})*$/i.test(code))throw Error('Invalid code response');row.codePresent=code.length>2;if(!row.codePresent)continue;
 for(const [field,data] of [['decimals','0x313ce567'],['totalSupply','0x18160ddd'],['paused','0x5c975abb']]){
  try{const value=word(await rpc('eth_call',[{to:address,data,gas:'0x186a0'},tag]));if(field==='paused'&&value>1n)throw Error('Not bool');if(field==='decimals'&&value>255n)throw Error('Not uint8');row[field]=value.toString();}catch{row[field]=null;}
 }
 if(name==='WQIE'&&row.decimals==='18')plan.push({name:'WQIE decimals = 18',target:address,callData:'0x313ce567',operator:0,expected:'18',maxAge:3600});
 if(row.paused!==null)row.pauseMethodCandidate={observed:row.paused,needsAbiReview:true};
 if(name==='WQIE'){
  row.nativeBalance=quantity(await rpc('eth_getBalance',[address,tag])).toString();row.balanceVsReportedSupply=row.totalSupply!==null&&row.decimals!==null?coverage(BigInt(row.nativeBalance),BigInt(row.totalSupply),BigInt(row.decimals)):'unverified';
 }
}
const confirm=await rpc('eth_getBlockByNumber',[tag,false]);if(confirm?.hash!==block.hash)throw Error('Block changed during scan');return {schemaVersion:1,chainId:1990,kind:'rpc-preflight-not-registry-receipt',block:{number:quantity(tag).toString(),hash:block.hash,timestamp},tokens,registrationCandidates:plan,limitations:['Read-only RPC snapshot, no CANARY transaction.','Matching native balance and reported supply is not proof of solvency or redeemability; supply may itself be computed from native balance.','paused() requires verified ABI and behavior review before use.']};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await scan(rpcClient(process.env.QIE_MAINNET_RPC||RPC));await writeFile('qie-preflight.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));console.log('Saved qie-preflight.json. No wallet or transaction used.');}catch(e){console.error('Preflight unavailable:',e.message);process.exitCode=1;}}
