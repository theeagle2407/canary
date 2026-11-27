import {compile} from './compile.mjs';
import {rpcClient,quantity,RPC} from './qie-preflight.mjs';
import {formatEther,isAddress} from 'ethers';
const address=process.argv[2];
if(!isAddress(address||''))throw Error('Provide only your public QIE wallet address as the argument. No private key.');
if(['0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1','0xffcf8fdee72ac11b5c542428b35eef5769c409f0'].includes(address.toLowerCase()))throw Error('Do not use a public deterministic local development wallet.');
const rpc=rpcClient(process.env.QIE_MAINNET_RPC||RPC);if(quantity(await rpc('eth_chainId'))!==1990n)throw Error('Wrong network');
const balance=quantity(await rpc('eth_getBalance',[address,'latest']));const gasPrice=quantity(await rpc('eth_gasPrice'));const artifacts=compile();const result={chainId:1990,address,balanceQIE:formatEther(balance),gasPriceWei:gasPrice.toString(),estimates:{},notes:['Read-only estimates. No signing or broadcasts.','Estimates exclude project registration, checks, worker funding and future fee changes.','Insufficient funds or RPC limitations may prevent estimation.']};
let total=0n;let complete=true;
for(const name of ['Canary','DemoVault']){try{const gas=quantity(await rpc('eth_estimateGas',[{from:address,data:artifacts[name].bytecode}]));const cost=gas*gasPrice;const buffer=(cost*150n+99n)/100n;total+=buffer;result.estimates[name]={gas:gas.toString(),estimatedQIE:formatEther(cost),with50PercentBufferQIE:formatEther(buffer)};}catch(e){complete=false;result.estimates[name]={error:e.message};}}
result.combinedDeploymentBufferQIE=complete?formatEther(total):null;result.balanceCoversDeploymentOnly=complete?balance>=total:null;console.log(JSON.stringify(result,null,2));
