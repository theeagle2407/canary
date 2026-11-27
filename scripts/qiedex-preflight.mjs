import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {rpcClient,quantity,word,TARGETS,RPC} from './qie-preflight.mjs';
export const FACTORY='0x8e23128a5511223be6c0d64106e2d4508c08398c';
export const ROUTER='0x08cd2e72e156d8563b4351eb4065c262a9f553ef';
export function addressWord(a){if(!/^0x[0-9a-f]{40}$/i.test(a))throw Error('Invalid address');return a.slice(2).toLowerCase().padStart(64,'0');}
export function decodeAddress(s){word(s);if(!/^0x0{24}[0-9a-f]{40}$/i.test(s))throw Error('Invalid address word');return '0x'+s.slice(-40).toLowerCase();}
export function decodeReserves(s){if(!/^0x[0-9a-f]{192}$/i.test(s))throw Error('Invalid reserve tuple');const [r0,r1,t]=[0,1,2].map(i=>BigInt('0x'+s.slice(2+i*64,66+i*64)));if(r0>=2n**112n||r1>=2n**112n||t>=2n**32n)throw Error('Invalid reserve bounds');return [r0,r1,t];}
const ZERO='0x'+'0'.repeat(40);
export async function scanDex(rpc){if(quantity(await rpc('eth_chainId'))!==1990n)throw Error('Wrong network');const block=await rpc('eth_getBlockByNumber',['latest',false]);if(!block?.hash||!block.number||Math.abs(Date.now()/1000-Number(quantity(block.timestamp)))>300)throw Error('Missing or stale block');const tag=block.number;
 const call=(to,data)=>rpc('eth_call',[{to,data,gas:'0x186a0'},tag]);const code=async a=>{if(!/^0x(?:[0-9a-f]{2})+$/i.test(await rpc('eth_getCode',[a,tag])))throw Error('No deployed code: '+a);};
 for(const a of [FACTORY,ROUTER,TARGETS.WQIE,TARGETS.QUSDC])await code(a);
 if(decodeAddress(await call(ROUTER,'0xc45a0155'))!==FACTORY)throw Error('Router factory mismatch');
 const lookup='0xe6a43905'+addressWord(TARGETS.WQIE)+addressWord(TARGETS.QUSDC);const pair=decodeAddress(await call(FACTORY,lookup));if(pair===ZERO)throw Error('No direct WQIE/QUSDC pair');await code(pair);
 const [token0,token1,pairFactory]=await Promise.all(['0x0dfe1681','0xd21220a7','0xc45a0155'].map(async s=>decodeAddress(await call(pair,s))));
 if(pairFactory!==FACTORY||[token0,token1].sort().join()!==[TARGETS.WQIE,TARGETS.QUSDC].sort().join())throw Error('Pair identity mismatch');
 const [r0,r1,lastUpdate]=decodeReserves(await call(pair,'0x0902f1ac'));const balances=await Promise.all([token0,token1].map(async a=>word(await call(a,'0x70a08231'+addressWord(pair)))));const decimals=await Promise.all([token0,token1].map(async a=>word(await call(a,'0x313ce567'))));if(decimals.some((d,i)=>d!==( [token0,token1][i]===TARGETS.WQIE?18n:6n)))throw Error('Unexpected token decimals');
 const confirm=await rpc('eth_getBlockByNumber',[tag,false]);if(confirm?.hash!==block.hash)throw Error('Snapshot block changed');
 const tokens=[token0,token1].map((a,i)=>({symbol:a===TARGETS.WQIE?'WQIE':'QUSDC',address:a,decimals:decimals[i].toString(),reserve:[r0,r1][i].toString(),balance:balances[i].toString(),balanceCoversRecordedReserve:balances[i]>=[r0,r1][i]}));
 return {chainId:1990,kind:'rpc-preflight-not-registry-receipt',block:{number:quantity(tag).toString(),hash:block.hash},factory:FACTORY,router:ROUTER,pair,tokens,lastReserveUpdateUint32:lastUpdate.toString(),registrationCandidates:[{name:'DEX router factory unchanged',target:ROUTER,callData:'0xc45a0155',operator:0,expected:BigInt(FACTORY).toString(),maxAge:3600},{name:'WQIE/QUSDC pair mapping unchanged',target:FACTORY,callData:lookup,operator:0,expected:BigInt(pair).toString(),maxAge:3600}],limitations:['Reserve data is a point-in-time RPC observation, not a swap execution or proof of safety.','A reserve floor requires a developer-defined threshold and a reserve adapter or extended registry; no automatic threshold inferred.','Reserve timestamp is last pool update, not an oracle heartbeat.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await scanDex(rpcClient(process.env.QIE_MAINNET_RPC||RPC));await writeFile('qiedex-preflight.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));console.log('Saved qiedex-preflight.json. No transaction used.');}catch(e){console.error('DEX preflight unavailable:',e.message);process.exitCode=1;}}
