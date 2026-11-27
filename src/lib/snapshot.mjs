import {Interface,ZeroAddress,toQuantity} from 'ethers';
import {scopedProjects} from './project-scope.mjs';
import {readEndpoints,readWithFailover} from './read-failover.mjs';
import {rpcRead,mapLimited,historyKey} from './snapshot-transport.mjs';
const historyCache=new Map();
export async function fetchSnapshot(cfg,sel,publicId,endpoints=readEndpoints(cfg),owner=null,pinned=[]){
 const isPublic=!!publicId,abi=new Interface(cfg.abi);
 return readWithFailover(endpoints,async(url,signal)=>{
  const started=Date.now();const rpc=(method,params,options={})=>rpcRead(url,method,params,{signal,...options});
  const [chain,head]=await Promise.all([rpc('eth_chainId',[]),rpc('eth_getBlockByNumber',['latest',false])]);
  if(BigInt(chain)!==BigInt(cfg.chainId))throw Error('RPC chain mismatch');
  if(!head?.number||!head.timestamp)throw Error('Latest block unavailable');
  const b={number:Number(BigInt(head.number)),timestamp:Number(BigInt(head.timestamp))};
  if(cfg.mode!=='local'&&Math.abs(Date.now()/1000-b.timestamp)>120)throw Error('RPC block stale');
  const tag=toQuantity(b.number);
  async function call(iface,target,fn,args=[]){const raw=await rpc('eth_call',[{to:target,data:iface.encodeFunctionData(fn,args)},tag]);return iface.decodeFunctionResult(fn,raw);}
  const [code,count]=await Promise.all([rpc('eth_getCode',[cfg.registry,tag]),call(abi,cfg.registry,'projectCount')]);
  if(!code||code==='0x')throw Error('Registry unavailable on configured chain');
  const total=BigInt(count[0]);const ids=isPublic?[String(publicId)]:Array.from({length:Number(total>50n?50n:total)},(_,i)=>String(total-BigInt(i)));
  if(!isPublic){for(const id of [sel,...pinned].filter(Boolean).map(String))if(!ids.includes(id))ids.push(id);}
  const discovered=(await mapLimited(ids.filter(x=>/^\d+$/.test(x)&&BigInt(x)>0n),async id=>{const x=await call(abi,cfg.registry,'getProject',[id]);return {id,owner:x.owner,name:x.name,ids:x.checkIds.map(String)}})).filter(x=>x.owner!==ZeroAddress);
  const {list,active}=owner||isPublic?scopedProjects(discovered,sel,publicId,owner):{list:discovered,active:discovered.find(x=>x.id===String(sel||''))||discovered[0]||null};
  const rows=active?await mapLimited(active.ids,async id=>{const [a]=await call(abi,cfg.registry,'getCheck',[id]);return {id,name:a.name,target:a.target,callData:a.callData,op:Number(a.op),expected:a.expected,maxAge:a.maxAge,active:a.active,status:a.status,checkedAt:a.checkedAt,checkedBlock:a.checkedBlock,observed:a.observed,runs:a.runs}}):[];
  // Optional data may fail independently; it never invalidates a successful essential snapshot.
  let events=[],historyUnavailable=false,paused=null;
  const remaining=()=>Math.max(0,22000-(Date.now()-started));
  const tasks=[];
  if(active){const start=Math.max(cfg.deploymentBlock,b.number-5000),key=historyKey(cfg,active,rows),cached=historyCache.get(key);
   if(cached&&Date.now()-cached.time<60000&&b.number>=cached.block){events=cached.events.filter(e=>e.block>=start);}
   else if(remaining()>1000)tasks.push((async()=>{try{const topics=abi.encodeFilterTopics('CheckExecuted',[BigInt(active.id)]);const logs=await rpc('eth_getLogs',[{address:cfg.registry,topics,fromBlock:toQuantity(start),toBlock:tag}],{timeout:Math.min(remaining(),2500),retries:0});events=logs.map(e=>{const a=abi.parseLog(e).args;return {id:String(a.checkId),status:Number(a.status),observed:String(a.observed),time:Number(a.checkedAt),tx:e.transactionHash,log:Number(BigInt(e.logIndex)),block:Number(BigInt(e.blockNumber))}}).sort((a,b)=>b.block-a.block||b.log-a.log).slice(0,25);if(historyCache.size>=100)historyCache.delete(historyCache.keys().next().value);historyCache.set(key,{time:Date.now(),block:b.number,events});}catch{historyUnavailable=true}})());
   else historyUnavailable=true;
  }
  if(cfg.demo&&active?.id===String(cfg.demoProject)&&remaining()>1000)tasks.push((async()=>{try{const demo=new Interface(cfg.demoAbi);const raw=await rpc('eth_call',[{to:cfg.demo,data:demo.encodeFunctionData('paused')},tag],{timeout:Math.min(remaining(),2500),retries:0});paused=demo.decodeFunctionResult('paused',raw)[0]}catch{}})());
  await Promise.all(tasks);
  return {list,active,rows,events,historyUnavailable,paused,b,endpoint:url};
 },{timeout:24000});
}
