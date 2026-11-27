import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const file=new URL('../src/main.jsx',import.meta.url),backup=new URL('../src/main.jsx.before-wallet-session',import.meta.url);
let s=readFileSync(file,'utf8');
if(s.includes('CANARY_WALLET_SESSION_V2')){console.log('Wallet session patch already installed.');process.exit(0)}
function replaceOnce(a,b){if(s.split(a).length!==2)throw Error('Unexpected source; no changes written: '+a.slice(0,100));s=s.replace(a,b)}
replaceOnce("import {findMetaMask} from './lib/wallet-provider.js';","import {findMetaMask} from './lib/wallet-provider.js';import {watchWalletSession} from './lib/wallet-session.mjs';");
replaceOnce("function App(){const [route,setRoute]=useState(location.hash||'#/');",`// CANARY_WALLET_SESSION_V2
function App(){const [provider,setProvider]=useState(null),[wallet,setWallet]=useState(null),[account,setAccount]=useState(''),[injectedWallet,setInjectedWallet]=useState(null);
useEffect(()=>{if(!cfg.registry)return;const p=new JsonRpcProvider(cfg.rpc);setProvider(p);return()=>p.destroy()},[]);
const disconnect=()=>{setWallet(null);setAccount('');setInjectedWallet(null)};
useEffect(()=>watchWalletSession(injectedWallet,account,cfg.chainId,disconnect),[injectedWallet,account]);
const session={provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect};
const [route,setRoute]=useState(location.hash||'#/');`);
replaceOnce("<Dashboard key={route.startsWith('#/p/')?'public':'app'}", "<Dashboard session={session} key={route.startsWith('#/p/')?'public':'app'}");
replaceOnce("function Dashboard({publicId}){const [provider,setProvider]=useState(null),[wallet,setWallet]=useState(null),[account,setAccount]=useState(''),[projects,setProjects]=useState([])","function Dashboard({publicId,session}){const {provider,wallet,setWallet,account,setAccount,injectedWallet,setInjectedWallet,disconnect}=session;const [projects,setProjects]=useState([])");
replaceOnce("const [injectedWallet,setInjectedWallet]=useState(null);const isPublic=!!publicId;","const isPublic=!!publicId;");
replaceOnce("useEffect(()=>{if(!cfg.registry){setLoading(false);return}const p=new JsonRpcProvider(cfg.rpc);setProvider(p);return()=>{p.destroy()}},[]);","useEffect(()=>{if(!cfg.registry)setLoading(false)},[]);");
const a=s.indexOf('useEffect(()=>{if(!injectedWallet)return;const change=');const b=s.indexOf('\nasync function action(',a);if(a<0||b<0)throw Error('Expected wallet listener missing; no changes written');s=s.slice(0,a)+s.slice(b+1);
replaceOnce("onClick={account?()=>{setWallet(null);setAccount('')}:connect}","onClick={account?disconnect:connect}");
replaceOnce("setWallet(null);setAccount('');const raw=await findMetaMask();","disconnect();const raw=await findMetaMask();");
if(!existsSync(backup))writeFileSync(backup,readFileSync(file));writeFileSync(file,s);console.log('Wallet session now belongs to App. Existing deployment unchanged.');
