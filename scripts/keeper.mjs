import {readFile,rename,mkdir,open,unlink} from 'node:fs/promises';
import {createHeartbeat} from './keeper-heartbeat.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import {Contract,JsonRpcProvider,FetchRequest,Wallet,parseEther,formatEther,keccak256,isAddress} from 'ethers';
import {publicationReason,statusName} from './monitor-policy.mjs';
import {createReadFailover,isTransient} from './read-failover.mjs';
import {TESTNET_RPCS,TESTNET_CHAIN,feeCeiling} from './testnet-guard.mjs';
import {nextIds,newJournal,validateJournal,reserveWrite,settleWrite} from './keeper-policy.mjs';
const cfg=JSON.parse(await readFile(new URL('../src/deployment.json',import.meta.url),'utf8'));
const expected='0x153c1879C87b4130D4f0746A848133c3acF18eEB', owner='0xb225e746e36947690b1a0153425a441af588f4f6';
if(cfg.mode!=='testnet'||cfg.chainId!==1983||!isAddress(cfg.registry)||cfg.registry.toLowerCase()!==expected.toLowerCase())throw Error('Expected existing QIE testnet registry. No writes.');
const dry=process.argv.includes('--dry-run'),once=dry||process.argv.includes('--once');
if(!dry&&process.env.CONFIRM_TESTNET!=='YES')throw Error('Explicit CONFIRM_TESTNET=YES required');
const key=process.env.CANARY_KEEPER_KEY||'';
if(!dry&&!/^(0x)?[0-9a-fA-F]{64}$/.test(key))throw Error('Provide a valid dedicated keeper key via the hidden prompt');
let wallet=null;if(!dry){try{wallet=new Wallet(key.startsWith('0x')?key:'0x'+key)}catch{throw Error('Invalid keeper key')}}
if(wallet&&wallet.address.toLowerCase()===owner)throw Error('Use a separate funded testnet-only keeper wallet, not the project owner.');
const budget=parseEther(process.env.CANARY_KEEPER_BUDGET||'0.05'), reserve=parseEther('0.02'), gasLimit=500000n, cap=50;
if(budget<=0n||budget>parseEther('0.1'))throw Error('Budget must be >0 and <=0.1 test QIE');
let heartbeat=null;const log=m=>{console.log(`${new Date().toISOString()} ${m}`);heartbeat?.(m)},reject=m=>Object.assign(Error(m),{endpointRejected:true});
let stopped=false,lastBlock=0,lock,lockPath,journalPath,j;
const stop=()=>{stopped=true};process.on('SIGINT',stop);process.on('SIGTERM',stop);
async function save(next){if(dry){j=next;return;}const tmp=new URL(journalPath.href+'.tmp');const f=await open(tmp,'w',0o600);try{await f.writeFile(JSON.stringify(next,null,2)+'\n');await f.sync()}finally{await f.close()}await rename(tmp,journalPath);j=next;}
const rpc=createReadFailover(TESTNET_RPCS,{open:async url=>{const req=new FetchRequest(url);req.timeout=10000;const p=new JsonRpcProvider(req,undefined,{batchMaxCount:1});try{if((await p.getNetwork()).chainId!==TESTNET_CHAIN)throw reject('Wrong chain');const b=await fresh(p);if(await p.getCode(cfg.registry,b.number)==='0x')throw reject('Registry missing');const r=new Contract(cfg.registry,cfg.abi,p);const project=await r.getProject(1n,{blockTag:b.number});if(project.owner.toLowerCase()!==owner)throw reject('Wrong registry identity');log(`RPC READY | ${url} | block=${b.number}`);return {p,r};}catch(e){p.destroy();throw e;}},close:c=>c.p.destroy(),sleep:delay,onFailure:(url,e)=>log(`RPC READ FAILED | ${url} | ${e.shortMessage||e.message}`)});
async function fresh(p){const b=await p.getBlock('latest');if(!b||Math.abs(Date.now()/1000-b.timestamp)>120||b.number<lastBlock)throw reject('Latest block not fresh or behind last observed block');return b;}
async function reconcile(){if(!j.pending)return true;const pending=j.pending;const {result}=await rpc.read(async ({p,r})=>{await fresh(p);const receipt=await p.getTransactionReceipt(pending.hash);if(!receipt)return null;if(receipt.from.toLowerCase()!==wallet.address.toLowerCase()||receipt.to?.toLowerCase()!==cfg.registry.toLowerCase())throw Error('Unexpected receipt identity');const event=receipt.logs.filter(l=>l.address.toLowerCase()===cfg.registry.toLowerCase()).map(l=>{try{return r.interface.parseLog(l)}catch{return null}}).find(l=>l?.name==='CheckExecuted'&&String(l.args.checkId)===pending.id&&l.args.runner.toLowerCase()===wallet.address.toLowerCase());return {hash:receipt.hash,block:receipt.blockNumber,status:receipt.status,event:event?statusName(event.args.status):null};});if(!result){log(`PENDING | ${pending.hash} | writes paused until receipt is found`);return false;}await save(settleWrite(j,result));log(`RECONCILED | check=${pending.id} | tx=${result.hash} | block=${result.block} | ${result.event||'NO EXECUTION EVENT'}`);if(result.status!==1||!result.event){log('WRITE FAILED | receipt recorded; stopping for operator review');stopped=true;return false;}return true;}
try{
 const identity={chainId:1983,registry:cfg.registry.toLowerCase(),signer:wallet?.address.toLowerCase()||'read-only'};
 j=newJournal(identity);
 if(!dry){const dir=new URL('../.canary-keeper/',import.meta.url);await mkdir(dir,{recursive:true,mode:0o700});const base=identity.registry+'-'+identity.signer;lockPath=new URL(base+'.lock',dir);journalPath=new URL(base+'.json',dir);lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));try{j=validateJournal(JSON.parse(await readFile(journalPath,'utf8')),identity)}catch(e){if(e.code!=='ENOENT')throw e;await save(j);} }
 if(!dry&&lock)heartbeat=createHeartbeat(cfg.registry,wallet.address);
 log(`KEEPER START | chain=1983 | all registered checks | ${dry?'read-only':wallet.address} | lifetime reserved=${formatEther(BigInt(j.spent))}`);
 do{
  try{
   const ready=dry||await reconcile();if(stopped)break;
   // Global check IDs are contiguous; bounded round-robin discovers checks from every project.
   const scan=await rpc.read(async ({p,r})=>{const b=await fresh(p);const total=await r.checkCount({blockTag:b.number});const ids=nextIds(total,j.cursor);const rows=[];for(const id of ids){const c=await r.getCheck(id,{blockTag:b.number});if(!c.active)continue;const [live]=await r.evaluate.staticCall(id,{gasLimit,blockTag:b.number});rows.push({id,c,live,reason:publicationReason(c,live,b.timestamp)});}return {b,total,ids,rows};});
   const {b,total,ids,rows}=scan.result;lastBlock=Math.max(lastBlock,b.number);let attempted=false;
   log(`SCAN | block=${b.number} | registered=${total} | active scanned=${rows.length}`);
   for(const {id,c,live,reason} of rows){log(`CHECK | project=${c.projectId} | id=${id} | recorded=${statusName(c.status)} | live=${statusName(live)} | action=${reason||'none'}`);}
   if(!dry&&ready&&!stopped){
    // At most one publication per cycle. Re-evaluate and obtain all read-only fee/nonce inputs with failover.
    const row=rows.find(x=>x.reason);if(row){
      const prep=await rpc.read(async ({p,r})=>{const head=await fresh(p);const c=await r.getCheck(row.id,{blockTag:head.number});if(!c.active)return null;const [live]=await r.evaluate.staticCall(row.id,{gasLimit,blockTag:head.number});const reason=publicationReason(c,live,head.timestamp);if(!reason)return null;const fees=await p.getFeeData();if(fees.gasPrice==null)throw reject('No gas quote');const nonce=await p.getTransactionCount(wallet.address,'pending');const latest=await p.getTransactionCount(wallet.address,'latest');if(nonce!==latest)throw Error('Keeper has an external pending transaction; review before writes');const fee=feeCeiling(gasLimit,fees.gasPrice,BigInt(j.spent),budget,await p.getBalance(wallet.address),reserve);const data=r.interface.encodeFunctionData('run',[row.id]);return {fee,nonce,gasPrice:fees.gasPrice,data,reason};});
      if(prep.result&&!stopped){const v=prep.result;const raw=await wallet.signTransaction({to:cfg.registry,data:v.data,value:0n,chainId:1983,nonce:v.nonce,gasLimit,gasPrice:v.gasPrice,type:0});const hash=keccak256(raw);const pending={id:String(row.id),nonce:v.nonce,hash,reason:v.reason,createdAt:new Date().toISOString()};await save(reserveWrite(j,pending,v.fee,budget,cap));attempted=true;log(`JOURNALED | check=${row.id} | tx=${hash} | nonce=${v.nonce}`);try{const response=await prep.connection.p.broadcastTransaction(raw);if(response.hash.toLowerCase()!==hash.toLowerCase())throw Error('Unexpected broadcast hash');log(`SUBMITTED | ${hash}`);}catch(e){log(`BROADCAST UNCERTAIN | ${hash} | ${e.shortMessage||e.message} | no automatic resend`);} }
    }
   }
   // Advance past the attempted check, otherwise past scanned page. Pending writes continue read-only scans.
   if(ids.length){const last=attempted?BigInt(j.pending.id):ids.at(-1);await save({...j,cursor:String(last>=total?1n:last+1n)});}
   if(!dry&&j.pending&&!stopped){await delay(5000);await reconcile();}
  }catch(e){if(isTransient(e)||e.endpointRejected){log(`SCAN UNAVAILABLE | ${e.shortMessage||e.message} | retrying; no duplicate writes`);if(once){process.exitCode=1;break;}}else{throw e;}}
  if(once||stopped)break;await delay(10000);
 }while(!stopped);
}catch(e){log(`STOPPED | ${e.shortMessage||e.message}`);process.exitCode=1;}finally{if(heartbeat)heartbeat('STOPPED | keeper exited');rpc.close();if(lock){await lock.close();await unlink(lockPath);}process.off('SIGINT',stop);process.off('SIGTERM',stop);}
