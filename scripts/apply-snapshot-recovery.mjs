import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../src/main.jsx',import.meta.url),vf=new URL('../vite.config.js',import.meta.url);let s=readFileSync(file,'utf8'),v=readFileSync(vf,'utf8');
if(s.includes('CANARY_SNAPSHOT_RECOVERY_V2')&&v.includes('canarySnapshotPlugin()')){console.log('Already installed');process.exit(0)}
if(!s.includes('CANARY_OVERVIEW_RECOVERY_V1'))throw Error('Apply Build 12.1 first');
function sub(a,b){if(s.split(a).length!==2)throw Error('Unexpected source: '+a.slice(0,110));s=s.replace(a,b)}
sub("import './styles.css';", "import './styles.css';import {fetchSnapshot} from './lib/snapshot.mjs';import {startPolling} from './lib/snapshot-policy.mjs';");
sub('const req=useRef(0);','const req=useRef(0),snapshotFlight=useRef(null);');
const a=s.indexOf('async function readSnapshot(sel)'),b=s.indexOf('useEffect(()=>{if(!injectedWallet)',a);if(a<0||b<0)throw Error('Unexpected snapshot version');
const prev=s.slice(a,b);if(!prev.includes('setInterval')||!prev.includes('setSnapshotId'))throw Error('Unexpected polling version');
s=s.slice(0,a)+`// CANARY_SNAPSHOT_RECOVERY_V2
async function readSnapshot(sel){if(!import.meta.env.DEV)return fetchSnapshot(cfg,sel,publicId);const query=new URLSearchParams({selected:sel||'',publicId:publicId||''});const response=await fetch('/__canary/snapshot?'+query,{cache:'no-store',signal:AbortSignal.timeout(55000)});const body=await response.json();if(!response.ok)throw Error(body.error||'Snapshot unavailable');return body;}
async function load(p=provider,sel=selected){if(!p)return false;const key=String(publicId||'')+':'+String(sel||'');if(snapshotFlight.current?.key===key)return snapshotFlight.current.promise;const token=++req.current;setLoading(true);const promise=(async()=>{try{const {list,active,rows,events,historyUnavailable,paused,b}=await readSnapshot(sel);if(token!==req.current)return false;setProjects(list);setSelected(active?.id||sel);setSnapshotId(active?.id||null);setChecks(rows);setHistory(events);setNow(Math.max(b.timestamp,Math.floor(Date.now()/1000)));setBlock(b.number);setDemoPaused(paused);setReadFailed(false);if(historyUnavailable)setNote('History RPC unavailable. Latest check records are still shown.');setErr('');return true;}catch(e){if(token===req.current){setReadFailed(true);setLiveResults({});}return false;}finally{if(token===req.current){setLoading(false);snapshotFlight.current=null;}}})();snapshotFlight.current={key,promise};return promise;}
useEffect(()=>{if(!provider)return;return startPolling(()=>load(provider,selected),{normal:cfg.mode==='local'?5000:15000,retry:5000})},[provider,selected,publicId]);
`+s.slice(b);
sub('Retry after network connectivity returns.','Retrying automatically. No refresh needed.');
sub('Network unavailable · showing last recorded snapshot, not current health.','Network unavailable · showing last recorded snapshot. Retrying automatically.');
sub('Network unavailable · project data could not be loaded.','Network unavailable · retrying automatically.');
if(!v.includes('canarySnapshotPlugin()')){if(!v.includes('plugins:[react(),tailwindcss()]'))throw Error('Unexpected Vite configuration');v="import {canarySnapshotPlugin} from './scripts/snapshot-plugin.mjs';\n"+v.replace('plugins:[react(),tailwindcss()]','plugins:[canarySnapshotPlugin(),react(),tailwindcss()]');}
writeFileSync(file,s);writeFileSync(vf,v);console.log('Snapshot recovery installed. Restart Vite.');
