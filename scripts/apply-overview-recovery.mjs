import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../src/main.jsx',import.meta.url);
let s=readFileSync(file,'utf8');
if(s.includes('CANARY_OVERVIEW_RECOVERY_V1')){console.log('Already installed');process.exit(0)}
function sub(a,b){if(s.split(a).length!==2)throw Error('Unexpected source: '+a.slice(0,100));s=s.replace(a,b)}
sub("import './styles.css';", "import './styles.css';import {readEndpoints,readWithFailover} from './lib/read-failover.mjs';");
sub('const req=useRef(0);','const req=useRef(0);const [readFailed,setReadFailed]=useState(false),[snapshotId,setSnapshotId]=useState(null);');
const start=s.indexOf('async function load(p=provider,sel=selected)');const end=s.indexOf('useEffect(()=>{if(!provider)',start);
if(start<0||end<0)throw Error('Unexpected load function');
const old=s.slice(start,end);
let body=old.slice(old.indexOf('const n=await p.getNetwork()'),old.indexOf('if(token!==req.current)return;setProjects(list)'));
if(!body.includes('const b=await p.getBlock'))throw Error('Unexpected snapshot function');
body=body.replace('const n=await p.getNetwork();if(Number(n.chainId)!==cfg.chainId)',"const chain=await p.send('eth_chainId',[]);if(BigInt(chain)!==BigInt(cfg.chainId))");
body=body.replace("if(await p.getCode(cfg.registry)==='0x')throw Error('Canary registry not found on configured chain. Redeploy or update configuration.');const c=contract(p);const b=await p.getBlock('latest');if(!b)throw Error('Latest block unavailable');", "const c=contract(p);const b=await p.getBlock('latest');if(!b)throw Error('Latest block unavailable');if(cfg.mode!=='local'&&Math.abs(Date.now()/1000-b.timestamp)>120)throw Error('RPC block stale');if(await p.getCode(cfg.registry,b.number)==='0x')throw Error('Registry unavailable on configured chain');const opts={blockTag:b.number};");
body=body.replace('c.projectCount()','c.projectCount(opts)').replace('c.getProject(id)','c.getProject(id,opts)').replace('c.getCheck(id)','c.getCheck(id,opts)').replace('.paused()}catch','.paused(opts)}catch');
s=s.slice(0,start)+`// CANARY_OVERVIEW_RECOVERY_V1
async function readSnapshot(sel){return readWithFailover(readEndpoints(cfg),async(url,signal)=>{const p=new JsonRpcProvider(url,undefined,{batchMaxCount:1});const abort=()=>p.destroy();signal.addEventListener('abort',abort,{once:true});try{${body}return {list,active,rows,events,historyUnavailable,paused,b};}finally{signal.removeEventListener('abort',abort);p.destroy()}})}
async function load(p=provider,sel=selected){if(!p)return;const token=++req.current;setLoading(true);try{const {list,active,rows,events,historyUnavailable,paused,b}=await readSnapshot(sel);if(token!==req.current)return;setProjects(list);setSelected(active?.id||sel);setSnapshotId(active?.id||null);setChecks(rows);setHistory(events);setNow(Math.max(b.timestamp,Math.floor(Date.now()/1000)));setBlock(b.number);setDemoPaused(paused);setReadFailed(false);if(historyUnavailable)setNote('History RPC unavailable. Latest check records are still shown.');setErr('');}catch(e){if(token===req.current){setReadFailed(true);setLiveResults({});setErr(errorText(e));}}finally{if(token===req.current)setLoading(false)}}
`+s.slice(end);
sub("const overall=!activeChecks.length?", "const overall=readFailed?'Unavailable':!activeChecks.length?");
sub('{!project?<div className="empty"><Layers size={34}/><h2>{loading?\'Loading projects…\':isPublic?\'Project not found\':\'No projects yet\'}</h2><p>{isPublic?\'Verify the shared project ID and registry.\':\'Connect a wallet and register your first project.\'}</p></div>:<>',`{readFailed&&<div className="notice error" role="status"><AlertCircle size={18}/>{snapshotId===selected&&project?'Network unavailable · showing last recorded snapshot, not current health.':'Network unavailable · project data could not be loaded.'}</div>}
{(!project||snapshotId!==selected)?<div className="empty"><Layers size={34}/><h2>{loading?'Loading projects…':readFailed?'Project data unavailable':isPublic?'Project not found':'No projects yet'}</h2><p>{readFailed?'Retry after network connectivity returns.':isPublic?'Verify the shared project ID and registry.':'Connect a wallet and register your first project.'}</p></div>:<>`);
sub('<MetricNumber value={passes}/>', '<MetricNumber value={readFailed?\'—\':passes}/>');
sub('<MetricNumber value={failed}/>', '<MetricNumber value={readFailed?\'—\':failed}/>');
sub('<small>Configured assertions</small>', '<small>{readFailed?\'Last snapshot only\':\'Configured assertions\'}</small>');
sub('<small>Within maximum age</small>', '<small>{readFailed?\'Freshness unavailable\':\'Within maximum age\'}</small>');
// Keep historical rows but label their status as recorded only while disconnected.
const heading='<th>Result</th>';
sub(heading,'<th>{readFailed?\'Last recorded result\':\'Result\'}</th>');
writeFileSync(file,s);console.log('Overview recovery installed. No deployment changes.');
