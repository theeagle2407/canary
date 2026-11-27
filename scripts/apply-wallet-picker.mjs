import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {patchMain as entryMain,patchLanding as entryLanding} from './apply-console-entry.mjs';
function swap(s,a,b,label){if(s.split(a).length!==2)throw Error('Unexpected '+label+'; no source edits written');return s.replace(a,b);}
const marker='// CANARY_WALLET_PICKER_V1';
export function patchMain(s){
  if(s.includes(marker))return s;
  if(!s.includes('// CANARY_CONSOLE_ENTRY_V1'))s=entryMain(s);
  s=swap(s,"import {findMetaMask} from './lib/wallet-provider.js';","import {createWalletDiscovery,authorizeWallet} from './lib/wallet-discovery.mjs';import WalletPicker from './components/WalletPicker.jsx';",'wallet import');
  s=swap(s,`const consoleConnectIntent=useRef(false);
const session={provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect,consoleConnectIntent};`,`${marker}
const [wallets,setWallets]=useState([]),[picker,setPicker]=useState(null),[walletBusy,setWalletBusy]=useState(''),[walletError,setWalletError]=useState('');
const discovery=useRef(null),connectionFlight=useRef(false);
useEffect(()=>{discovery.current=createWalletDiscovery(window,setWallets);return()=>{discovery.current?.stop();discovery.current=null}},[]);
function showPicker(enter){if(connectionFlight.current)return;setWalletError('');setPicker({enter});discovery.current?.request();}
function closePicker(){if(!connectionFlight.current)setPicker(null);}
async function selectWallet(choice){if(connectionFlight.current||!picker)return;connectionFlight.current=true;setWalletBusy(choice.name);setWalletError('');try{
  let signer,address;if(cfg.mode==='local'){if(!provider)throw Error('Local RPC unavailable.');signer=await provider.getSigner(0);address=await signer.getAddress();}else{({signer,address}=await authorizeWallet(choice.provider,cfg,raw=>new BrowserProvider(raw),getAddress));}
  setInjectedWallet(choice.provider);setWallet(signer);setAccount(address);const enter=picker.enter;setPicker(null);if(enter)enterConsole();
}catch(e){setWalletError(Number(e?.code)===4001?'Connection cancelled. Choose a wallet to try again.':errorText(e));}finally{connectionFlight.current=false;setWalletBusy('');}}
const session={provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect,openWalletPicker:()=>showPicker(false),openConsole};`,'session');
  s=swap(s,"const f=()=>{const next=location.hash||'#/';if(next!=='#/app')consoleConnectIntent.current=false;setRoute(next)};","const f=()=>setRoute(location.hash||'#/');",'hash listener');
  s=swap(s,"function openConsole(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();consoleConnectIntent.current=!account;location.hash='#/app';setRoute('#/app');}","function enterConsole(){location.hash='#/app';setRoute('#/app');}\nfunction openConsole(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(account&&wallet)enterConsole();else showPicker(true);}\nfunction renderRoute(){",'entry handler');
  s=swap(s,"if(route==='#/docs')return <Docs/>;","if(route==='#/docs')return <Docs onOpenConsole={openConsole}/>;",'docs route');
  s=swap(s,"publicId={route.startsWith('#/p/')?route.split('/')[2]:null}/>}","publicId={route.startsWith('#/p/')?route.split('/')[2]:null}/>;}\nreturn <>{renderRoute()}{picker&&<WalletPicker wallets={wallets} busy={walletBusy} error={walletError} close={closePicker} select={selectWallet} refresh={()=>discovery.current?.request()} local={cfg.mode==='local'} network={cfg.name}/>}</>;} ",'route shell');
  s=swap(s,'function Docs(){','function Docs({onOpenConsole}){','docs component');
  s=swap(s,'<a className="btn outline" href="#/app">Open app','<a className="btn outline" href="#/app" onClick={onOpenConsole}>Open app','docs header');
  s=swap(s,'<a className="btn primary" href="#/app">Open app','<a className="btn primary" href="#/app" onClick={onOpenConsole}>Open app','docs CTA');
  s=swap(s,'disconnect,consoleConnectIntent}=session;','disconnect,openWalletPicker,openConsole}=session;','dashboard session');
  const start=s.indexOf('// CANARY_METAMASK_SELECTION_V1\nasync function connect()'),end=s.indexOf('// CANARY_LIVE_EVALUATE_V1',start);
  if(start<0||end<0||!s.slice(start,end).includes('consoleConnectIntent.current'))throw Error('Unexpected old connection flow');
  s=s.slice(0,start)+s.slice(end);
  s=swap(s,'onClick={account?disconnect:connect}','onClick={account?disconnect:openWalletPicker}','dashboard connect button');
  s=swap(s,'<a href="#/app" className="btn outline">Open app','<a href="#/app" onClick={openConsole} className="btn outline">Open app','public report CTA');
  s=s.replaceAll('Reconnect MetaMask.','Reconnect your wallet.');
  return s;
}
export async function apply(root){const a=resolve(root,'src/main.jsx'),b=resolve(root,'src/components/ProductLanding.jsx');const oldA=await readFile(a,'utf8'),oldB=await readFile(b,'utf8');const nextA=patchMain(oldA),nextB=entryLanding(oldB);if(oldA!==nextA)await writeFile(a,nextA);if(oldB!==nextB)await writeFile(b,nextB);console.log('CANARY wallet picker installed: select detected wallet before entering console.');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await apply(fileURLToPath(new URL('../',import.meta.url)));}catch(e){console.error('STOPPED:',e.message);process.exitCode=1;}}
