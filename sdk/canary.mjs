// Read-only registry SDK. Numeric EVM values are decimal strings, not JS numbers.
export class CanaryError extends Error {
  constructor(code,message){super(message);this.name='CanaryError';this.code=code;}
}
const bad=(message)=>new CanaryError('INVALID_INPUT',message);
const unavailable=()=>new CanaryError('UNAVAILABLE','Registry evidence unavailable');
const zero='0x'+'0'.repeat(40);
export function projectId(value){
  const s=typeof value==='bigint'?value.toString():value;
  if(typeof s!=='string'||!(/^[1-9][0-9]{0,77}$/).test(s)||BigInt(s)>=2n**256n)throw bad('Use a positive uint256 project ID as a decimal string');
  return s;
}
export function summarize(checks,now){
  const counts={active:0,passed:0,failed:0,errors:0,stale:0,unverified:0,retired:0};
  const results=checks.map(c=>{
    let state;
    if(!c.active){state='retired';counts.retired++;}
    else {
      counts.active++;
      if(c.status===0||!Number.isSafeInteger(c.checkedAt)||c.checkedAt<=0||c.checkedAt>now||!Number.isSafeInteger(c.maxAge)||c.maxAge<60||c.maxAge>2592000){state='unverified';counts.unverified++;}
      else if(now>c.checkedAt+c.maxAge){state='stale';counts.stale++;}
      else if(c.status===1){state='passed';counts.passed++;}
      else if(c.status===2){state='failed';counts.failed++;}
      else if(c.status===3){state='error';counts.errors++;}
      else {state='unverified';counts.unverified++;}
    }
    return {...c,state};
  });
  const state=counts.failed||counts.errors?'failed':counts.stale?'stale':counts.unverified||!counts.active?'unverified':'passed';
  return {state,allFreshPass:state==='passed',counts,checks:results};
}
export async function readSnapshot({provider,registry,config,id,clock=Date.now}){
  id=projectId(id);
  const chain=await provider.send('eth_chainId',[]);
  if(BigInt(chain)!==BigInt(config.chainId))throw unavailable();
  const block=await provider.getBlock('latest');
  if(!block||!Number.isSafeInteger(block.number)||!Number.isSafeInteger(block.timestamp)||!block.hash)throw unavailable();
  const opts={blockTag:block.number};
  if(await provider.getCode(config.registry,block.number)==='0x')throw unavailable();
  const p=await registry.getProject(BigInt(id),opts);
  if(p.owner.toLowerCase()===zero)throw new CanaryError('NOT_FOUND','Project not found');
  if(p.checkIds.length>64||new Set(p.checkIds.map(String)).size!==p.checkIds.length)throw unavailable();
  const checks=[];
  for(let i=0;i<p.checkIds.length;i+=8){
    const ids=p.checkIds.slice(i,i+8);
    const rows=await Promise.all(ids.map(cid=>registry.getCheck(cid,opts)));
    for(let j=0;j<rows.length;j++){
      const c=rows[j];if(String(c.projectId)!==id)throw unavailable();
      checks.push({id:String(ids[j]),name:c.name,target:c.target,callData:c.callData,operator:Number(c.op),expected:String(c.expected),observed:String(c.observed),active:c.active,status:Number(c.status),checkedAt:Number(c.checkedAt),checkedBlock:String(c.checkedBlock),maxAge:Number(c.maxAge),runs:String(c.runs)});
    }
  }
  const again=await provider.getBlock(block.number);
  if(!again||again.hash!==block.hash)throw unavailable();
  const fetchedAt=clock();const now=Math.max(block.timestamp,Math.floor(fetchedAt/1000));
  return {schemaVersion:1,chainId:Number(config.chainId),registry:config.registry,project:{id,name:p.name,owner:p.owner},block:{number:block.number,hash:block.hash,timestamp:block.timestamp},fetchedAt:new Date(fetchedAt).toISOString(),asOf:now,...summarize(checks,now)};
}
export function createCanary(config,{timeoutMs=10000}={}){
  if(!config||!/^0x[0-9a-fA-F]{40}$/.test(config.registry||'')||config.registry.toLowerCase()===zero||!Number.isSafeInteger(config.chainId)||config.chainId<=0||!Array.isArray(config.abi)||!config.abi.length||typeof config.rpc!=='string')throw bad('A deployed registry configuration is required');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>60000)throw bad('Invalid timeout');
  return {async getProject(id){
    id=projectId(id);
    const {JsonRpcProvider,Contract}=await import('ethers');
    const provider=new JsonRpcProvider(config.rpc,undefined,{cacheTimeout:-1});
    let timer;
    try{
      const registry=new Contract(config.registry,config.abi,provider);
      return await Promise.race([readSnapshot({provider,registry,config,id}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(unavailable()),timeoutMs);})]);
    }catch(e){if(e instanceof CanaryError)throw e;throw unavailable();}
    finally{clearTimeout(timer);provider.destroy();}
  }};
}
