import {readFile,writeFile} from 'node:fs/promises';
const edits=[
 ['src/main.jsx','if(!import.meta.env.DEV)return fetchSnapshot(cfg,sel,publicId);','/* CANARY production same-origin snapshot */'],
 ['src/components/Infrastructure.jsx',"import.meta.env.DEV?'http://127.0.0.1:8788':''","import.meta.env.DEV?'http://127.0.0.1:8788':window.location.origin"],
 ['src/components/Notifications.jsx',"import.meta.env.DEV?'http://127.0.0.1:8790':''","import.meta.env.DEV?'http://127.0.0.1:8790':window.location.origin"],
 ['src/components/Notifications.jsx','{settings?<>','{!import.meta.env.DEV?<p className="infra-note">Notifications are managed by the operator. Delivery history is read-only.</p>:settings?<>'],
 ['scripts/start-stack.mjs',"['--keeper','--webhook']","['--keeper','--webhook','--production']"],
 ['scripts/start-stack.mjs',"['frontend',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort']]","['frontend',args.includes('--production')?['scripts/production.mjs']:['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort']]"],
 ['scripts/start-stack.mjs','const withKeeper=args.includes','/* CANARY_PRODUCTION_STACK */\nconst withKeeper=args.includes'],
];
const grouped=new Map();for(const [file,from,to] of edits){if(from===to)continue;const url=new URL('../'+file,import.meta.url);let s=grouped.get(file)??await readFile(url,'utf8');if(s.includes(to))continue;if(!s.includes(from))throw Error(`Unexpected source: ${file}. Apply Build 17 first.`);s=s.replace(from,to);grouped.set(file,s);}
for(const [file,s] of grouped)await writeFile(new URL('../'+file,import.meta.url),s);
// Production-only badge reads use the same server snapshot as the console.
const badge=new URL('../src/components/ReliabilityBadge.jsx',import.meta.url);let b=await readFile(badge,'utf8');if(!b.includes('CANARY_SERVER_BADGE')){const old='provider=new JsonRpcProvider(config.rpc);';if(!b.includes(old))throw Error('Unexpected badge source');b=b.replace(old,`/* CANARY_SERVER_BADGE */
        if(!import.meta.env.DEV){
          const response=await fetch('/__canary/snapshot?publicId='+encodeURIComponent(projectId),{cache:'no-store',signal:AbortSignal.timeout(55000)});
          if(!response.ok)throw Error('Unavailable');const x=await response.json();if(String(x.active?.id)!==projectId||!Array.isArray(x.rows)||!Number.isSafeInteger(x.b?.timestamp))throw Error('Invalid snapshot');
          if(!cancelled){setSnapshot({checks:x.rows,name:x.active.name,blockTime:x.b.timestamp,block:x.b.number,fetchedAt:Date.now()});setError(false);setNow(Date.now());}return;
        }
        provider=new JsonRpcProvider(config.rpc);`);await writeFile(badge,b);}
const ignore=new URL('../.gitignore',import.meta.url);let ig=await readFile(ignore,'utf8');if(!ig.includes('# CANARY production'))await writeFile(ignore,ig+'\n# CANARY production\n*.before-*\nsrc/deployment.local.json\n.canary-cloud.env\n');
console.log('Production gateway integration applied. Run npm run build.');
