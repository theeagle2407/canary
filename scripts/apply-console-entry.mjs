import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

function swap(s,old,next,label){
  const count=(s.split(old).length-1), done=(s.split(next).length-1);
  if(done===1&&count===0)return s;
  if(count!==1||done!==0)throw Error(`Unexpected ${label} source; no changes written`);
  return s.replace(old,next);
}
export function patchMain(s){
  s=swap(s,'function Landing(){return <ProductLanding Logo={Logo} config={cfg}/>;}','function Landing({onOpenConsole}){return <ProductLanding Logo={Logo} config={cfg} onOpenConsole={onOpenConsole}/>;}','landing wrapper');
  s=swap(s,'const session={provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect};','const consoleConnectIntent=useRef(false);\nconst session={provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect,consoleConnectIntent};','wallet session');
  s=swap(s,"const f=()=>setRoute(location.hash||'#/');","const f=()=>{const next=location.hash||'#/';if(next!=='#/app')consoleConnectIntent.current=false;setRoute(next)};",'hash listener');
  s=swap(s,"if(route==='#/'||route===''||route==='#features')return <Landing/>;","function openConsole(e){if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();consoleConnectIntent.current=!account;location.hash='#/app';setRoute('#/app');}\nif(route==='#/'||route===''||route==='#features')return <Landing onOpenConsole={openConsole}/>;",'landing route');
  s=swap(s,'const {provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect}=session;','const {provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect,consoleConnectIntent}=session;','dashboard session');
  if(!s.includes('// CANARY_CONSOLE_ENTRY_V1'))s=swap(s,'// CANARY_LIVE_EVALUATE_V1','// CANARY_CONSOLE_ENTRY_V1\n// Consume only explicit landing CTA intent; never prompt public reports or retry automatically.\nuseEffect(()=>{if(isPublic||!provider||!consoleConnectIntent.current)return;consoleConnectIntent.current=false;if(!account)void connect();},[provider,isPublic,account,consoleConnectIntent]);\n// CANARY_LIVE_EVALUATE_V1','connect effect');
  return s;
}
export function patchLanding(s){
  s=swap(s,'function ProductLanding({Logo,config})','function ProductLanding({Logo,config,onOpenConsole})','landing props');
  const old='href="#/app"',next='href="#/app" onClick={onOpenConsole}';
  const matches=[...s.matchAll(/href="#\/app"(?: onClick=\{onOpenConsole\})?/g)].map(m=>m[0]);
  if(matches.length!==3||(!matches.every(m=>m===old)&&!matches.every(m=>m===next)))throw Error('Unexpected landing CTA count; no changes written');
  if(matches.every(m=>m===old))s=s.replaceAll(old,next);
  const sentence='<br/>Configured checks are not a security audit or guarantee of future behavior.';
  if(s.includes(sentence)){if(s.split(sentence).length!==2)throw Error('Unexpected footer count');s=s.replace(sentence,'');}
  if(s.includes('Configured checks are not a security audit or guarantee of future behavior.'))throw Error('Unexpected footer text');
  return s;
}
export async function apply(root){
  const main=resolve(root,'src/main.jsx'),landing=resolve(root,'src/components/ProductLanding.jsx');
  const a=await readFile(main,'utf8'),b=await readFile(landing,'utf8');
  const nextA=patchMain(a),nextB=patchLanding(b);
  if(nextA!==a)await writeFile(main,nextA);
  if(nextB!==b)await writeFile(landing,nextB);
  console.log('CANARY console entry updated: landing CTA wallet prompt; footer sentence removed.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await apply(fileURLToPath(new URL('../',import.meta.url)));}catch(e){console.error('STOPPED:',e.message);process.exitCode=1;}}
