// CANARY_MAINNET_ACTIVATION_V1
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);if(args.some(x=>!['--keeper','--webhook','--production'].includes(x)))throw Error('Usage: npm run stack -- [--keeper] [--webhook]');
/* CANARY_PRODUCTION_STACK */
const withKeeper=args.includes('--keeper'),withWebhook=args.includes('--webhook');
if(withWebhook){const u=new URL(process.env.CANARY_WEBHOOK_URL||'');if(u.protocol!=='https:'||u.username||u.password||!(process.env.CANARY_WEBHOOK_SECRET||'').match(/^.{16,}$/))throw Error('Configure trusted HTTPS webhook URL and secret first');}
const cfg=JSON.parse(await readFile(new URL('../src/deployment.json',import.meta.url),'utf8'));
if(!((cfg.mode==='testnet'&&cfg.chainId===1983)||(cfg.mode==='mainnet'&&cfg.chainId===1990))||!/^0x[0-9a-f]{40}$/i.test(cfg.registry))throw Error('Local stack requires an existing QIE deployment. No transactions submitted.');
if(withKeeper&&((cfg.chainId===1990?process.env.CONFIRM_MAINNET:process.env.CONFIRM_TESTNET)!=='YES'||!/^(0x)?[0-9a-f]{64}$/i.test(process.env.CANARY_KEEPER_KEY||'')))throw Error('Use the dedicated keeper key and explicit network confirmation.');
const jobs=[['frontend',args.includes('--production')?['scripts/production.mjs']:['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort']],['api',['scripts/api.mjs']],['infrastructure',['scripts/infrastructure.mjs']],['notifications',['scripts/notifications.mjs',...(withWebhook?[]:['--demo'])]]];
if(withKeeper)jobs.push(['keeper',[cfg.chainId===1990?'scripts/mainnet-keeper.mjs':'scripts/keeper.mjs']]);
await Promise.all(jobs.map(([,a])=>access(new URL('../'+a[0],import.meta.url))));
// Fail before launching any process if a previous local stack is still listening.
for(const port of [5173,8787,8788,8790,8791])await new Promise((resolve,reject)=>{const s=createServer();s.once('error',()=>reject(Error(`Port ${port} busy. Stop the previous CANARY services before starting the stack.`)));s.listen(port,'127.0.0.1',()=>s.close(resolve));});
const safeEnv={...process.env,CANARY_API_PORT:'8787'};
for(const k of Object.keys(safeEnv))if(/KEY|SECRET|MNEMONIC|CONFIRM_MAINNET|CONFIRM_TESTNET/i.test(k))delete safeEnv[k];
const children=new Map();let stopping=false;
function stop(reason,code=0){if(stopping)return;stopping=true;process.exitCode=code;console.log(`\nCANARY stack stopping: ${reason}. Waiting for graceful child shutdown.`);for(const c of children.values())c.kill('SIGTERM');}
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>stop(sig));
for(const [name,argv] of jobs){if(stopping)break;const env={...safeEnv};if(name==='notifications'&&withWebhook){env.CANARY_WEBHOOK_URL=process.env.CANARY_WEBHOOK_URL;env.CANARY_WEBHOOK_SECRET=process.env.CANARY_WEBHOOK_SECRET;}if(name==='keeper'){env.CANARY_KEEPER_KEY=process.env.CANARY_KEEPER_KEY;env[cfg.chainId===1990?'CONFIRM_MAINNET':'CONFIRM_TESTNET']='YES';}const c=spawn(process.execPath,argv,{cwd:root,env,stdio:['ignore','inherit','inherit'],detached:process.platform!=='win32'});children.set(name,c);c.once('error',e=>{children.delete(name);stop(`${name}: ${e.message}`,1)});c.once('exit',(code,signal)=>{children.delete(name);if(!stopping)stop(`${name} exited (${code??signal})`,1);});console.log(`Started ${name} (PID ${c.pid})`);}
// Deliberately no automatic restart, especially for a signer with a pending journal.
console.log('Local CANARY stack · http://127.0.0.1:5173 · notifications use '+(withWebhook?'operator-configured HTTPS receiver.':'local loopback receiver.'));
