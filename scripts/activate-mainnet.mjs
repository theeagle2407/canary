import {readFile,writeFile,rename,mkdir,access} from 'node:fs/promises';
import {prepareEdits} from './mainnet-activation-edits.mjs';
import {buildConfig} from './mainnet-activation-policy.mjs';
import {rpcClient,quantity} from './qie-preflight.mjs';
import {assertHead} from './mainnet-registry.mjs';
import {verifyProject,verifyCheck} from './mainnet-keeper.mjs';
import {validateJournal} from './keeper-policy.mjs';
const root=new URL('../',import.meta.url),read=async f=>readFile(new URL(f,root),'utf8'),json=async f=>JSON.parse(await read(f));
const record=await json('.canary-mainnet/mainnet-registry.json');const {compile}=await import('./compile.mjs');const {keccak256,Interface}=await import('ethers');const artifact=compile().Canary;if(keccak256(artifact.bytecode)!==record.bytecodeHash)throw Error('Registry source differs from deployed bytecode');const cfg=buildConfig(record,artifact.abi),iface=new Interface(cfg.abi);
const signer='0xb37b46f58cd7e384dbd051332eb0c6e110e3ed7c', journal=await json('.canary-mainnet/keeper/'+signer+'.json');validateJournal(journal,{chainId:1990,registry:cfg.registry,signer,project:'1'});if(journal.pending||journal.writes<3)throw Error('Reconcile initial keeper receipts before activation');
const rpc=rpcClient(cfg.rpc),b=await rpc('eth_getBlockByNumber',['latest',false]);assertHead(await rpc('eth_chainId'),b);if(keccak256(await rpc('eth_getCode',[cfg.registry,b.number]))!==cfg.runtimeCodeHash)throw Error('Registry runtime mismatch');const receipt=await rpc('eth_getTransactionReceipt',[cfg.deployTx]);if(!receipt||quantity(receipt.status)!==1n||receipt.contractAddress.toLowerCase()!==cfg.registry||quantity(receipt.blockNumber)!==BigInt(cfg.deploymentBlock))throw Error('Deployment receipt mismatch');
const call=async(fn,args)=>iface.decodeFunctionResult(fn,await rpc('eth_call',[{to:cfg.registry,data:iface.encodeFunctionData(fn,args)},b.number]));verifyProject(await call('getProject',[1]));for(const id of ['1','2','3']){const c=(await call('getCheck',[id]))[0];verifyCheck(c,id);if(Number(c.status)===0||BigInt(c.runs)<1n)throw Error('Missing recorded check '+id);console.log('Recorded check',id,'status',String(c.status),'block',String(c.checkedBlock));}if((await rpc('eth_getBlockByNumber',[b.number,false]))?.hash!==b.hash)throw Error('Block changed');
const edits=await prepareEdits(read);
const oldConfig=await json('src/deployment.json');if(!['testnet','mainnet'].includes(oldConfig.mode))throw Error('Unexpected current deployment');
await mkdir(new URL('.canary-mainnet/activation-backup/',root),{recursive:true,mode:0o700});for(const [file,{old,next}] of edits){if(old===next)continue;const backup=new URL('.canary-mainnet/activation-backup/'+file.replaceAll('/','__'),root);try{await writeFile(backup,old,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}await writeFile(new URL(file,root),next);}
if(oldConfig.mode==='testnet'){try{await writeFile(new URL('.canary-mainnet/activation-backup/testnet-deployment.json',root),JSON.stringify(oldConfig,null,2),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}}
const tmp=new URL('src/deployment.json.tmp',root);await writeFile(tmp,JSON.stringify(cfg,null,2)+'\n');await rename(tmp,new URL('src/deployment.json',root));console.log('Mainnet configuration activated. No writes to chain. Rebuild before starting production. Existing keeper journal required.');
