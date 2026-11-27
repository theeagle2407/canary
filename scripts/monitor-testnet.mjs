import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { Contract, JsonRpcProvider, FetchRequest, Wallet, isAddress, parseEther, formatEther } from 'ethers';
import { publicationReason, statusName } from './monitor-policy.mjs';
import { TESTNET_RPCS, TESTNET_CHAIN, feeCeiling } from './testnet-guard.mjs';
import { createReadFailover, isTransient } from './read-failover.mjs';
const config=JSON.parse(await readFile(new URL('../src/deployment.json',import.meta.url),'utf8'));
const expectedRegistry='0x153c1879C87b4130D4f0746A848133c3acF18eEB';
const owner='0xb225e746e36947690b1a0153425a441af588f4f6';
if(config.mode!=='testnet'||config.chainId!==Number(TESTNET_CHAIN)||!isAddress(config.registry)||config.registry.toLowerCase()!==expectedRegistry.toLowerCase()) throw Error('Expected existing CANARY QIE testnet deployment. No transaction sent.');
if(!Array.isArray(config.abi)||!config.abi.length) throw Error('Missing registry ABI');
const dry=process.argv.includes('--dry-run'), once=dry||process.argv.includes('--once');
if(!dry && process.env.CONFIRM_TESTNET!=='YES') throw Error('Set CONFIRM_TESTNET=YES for testnet writes.');
const wallet=dry?null:new Wallet(process.env.CANARY_TESTNET_KEY||'');
if(wallet&&wallet.address.toLowerCase()!==owner) throw Error('Use funded dedicated project wallet for this test');
const budget=parseEther(process.env.CANARY_SESSION_BUDGET||'0.05'), reserve=parseEther('0.02');
if(budget<=0n||budget>parseEther('0.1')) throw Error('Session budget must be >0 and <=0.1 test QIE');
const gasLimit=500000n, maxWrites=20, poll=10000;
let spent=0n,writes=0,stopped=false,hadError=false,lastBlock=0;
const log=msg=>console.log(`${new Date().toISOString()} ${msg}`);
const stop=()=>{stopped=true;}; process.on('SIGINT',stop); process.on('SIGTERM',stop);
const reject=message=>Object.assign(Error(message),{endpointRejected:true});
async function freshBlock(p){const b=await p.getBlock('latest');if(!b||Math.abs(Date.now()/1000-b.timestamp)>120||b.number<lastBlock)throw reject('Latest block not fresh or behind last observed block');return b;}
const rpc=createReadFailover(TESTNET_RPCS,{
  open:async url=>{
    const req=new FetchRequest(url);req.timeout=10000;
    const p=new JsonRpcProvider(req,undefined,{batchMaxCount:1});
    try{
      if((await p.getNetwork()).chainId!==TESTNET_CHAIN)throw reject('Wrong chain');
      const b=await freshBlock(p);
      if(await p.getCode(config.registry,b.number)==='0x')throw reject('Expected registry not found');
      const registry=new Contract(config.registry,config.abi,p);
      const project=await registry.getProject(1n,{blockTag:b.number});
      if(project.owner.toLowerCase()!==owner)throw reject('Unexpected demonstration project owner');
      log(`RPC READY | ${url} | block=${b.number}`);
      return {p,registry};
    }catch(e){p.destroy();throw e;}
  },close:c=>c.p.destroy(),sleep:delay,onFailure:(url,e)=>log(`RPC READ FAILED | ${url} | ${e.shortMessage||e.message}`)
});
try{
  log(`MONITOR START | chain=1983 | project=1 | mode=${dry?'read-only':'testnet writes'}`);
  do{
    let scanned=0,published=0,scan;
    try{
      // Complete a coherent read snapshot before considering any write.
      scan=await rpc.read(async ({p,registry})=>{
        const b=await freshBlock(p), blockTag=b.number;
        const project=await registry.getProject(1n,{blockTag});
        if(project.owner.toLowerCase()!==owner)throw reject('Unexpected project owner');
        if(!project.checkIds.length||project.checkIds.length>64)throw Error('Unexpected check count');
        const checks=[];
        for(const id of project.checkIds){
          const check=await registry.getCheck(id,{blockTag});if(!check.active)continue;
          const [live]=await registry.evaluate.staticCall(id,{gasLimit,blockTag});
          checks.push({id,check,live,reason:publicationReason(check,live,b.timestamp)});
        }
        return {block:b.number,checks};
      });
    }catch(e){
      if(once||(!isTransient(e)&&!e.endpointRejected))throw e;
      log('SCAN UNAVAILABLE | no verification result published | retrying next cycle');
      if(!stopped)await delay(poll);continue;
    }
    lastBlock=Math.max(lastBlock,scan.result.block);
    for(const {id,check,live,reason} of scan.result.checks){
      if(stopped)break;
      scanned++;
      log(`CHECK | id=${id} | recorded=${statusName(check.status)} | live=${statusName(live)} | action=${reason||'none'} | rpc=${scan.url}`);
      if(!reason||dry)continue;
      if(writes>=maxWrites)throw Error('Session transaction cap reached');
      // No failover or retry once entering the write path, including ambiguous broadcasts.
      const {p,registry}=scan.connection;
      const signer=wallet.connect(p), writable=registry.connect(signer);
      const fees=await p.getFeeData();if(fees.gasPrice==null)throw Error('No legacy gas quote');
      const maxFee=feeCeiling(gasLimit,fees.gasPrice,spent,budget,await p.getBalance(signer.address),reserve);
      spent+=maxFee;writes++;
      const tx=await writable.run(id,{gasLimit,gasPrice:fees.gasPrice,type:0});
      log(`SUBMITTED | check=${id} | tx=${tx.hash}`);
      const r=await tx.wait(1,90000);
      if(!r||r.status!==1)throw Error('Unconfirmed or failed transaction: '+tx.hash);
      const event=r.logs.filter(l=>l.address.toLowerCase()===config.registry.toLowerCase()).map(l=>{try{return registry.interface.parseLog(l)}catch{return null}}).find(l=>l?.name==='CheckExecuted'&&l.args.checkId===id);
      if(!event)throw Error('Missing execution event: '+tx.hash);
      published++;
      log(`RECORDED | check=${id} | ${statusName(check.status)} -> ${statusName(event.args.status)} | reason=${reason} | block=${r.blockNumber} | tx=${tx.hash}`);
    }
    log(`SCAN | active=${scanned} | published=${published} | fee ceiling used=${formatEther(spent)} | writes=${writes}`);
    if(once||stopped)break;await delay(poll);
  }while(!stopped);
}catch(e){hadError=true;log(`STOPPED | ${e.shortMessage||e.message} | if in write mode inspect wallet history and nonce before restarting`);}
finally{rpc.close();process.off('SIGINT',stop);process.off('SIGTERM',stop);}
if(hadError)process.exitCode=1;
