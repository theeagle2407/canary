// CANARY_MAINNET_ACTIVATION_V1
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createGateway} from './production-gateway.mjs';
import {canarySnapshotPlugin} from './snapshot-plugin.mjs';
import {canaryIdentityPlugin} from './qie-id-plugin.mjs';
import {canaryProtocolsPlugin} from './protocols-plugin.mjs';
const cfg=JSON.parse(await readFile(new URL('../src/deployment.json',import.meta.url),'utf8'));
if(!((cfg.mode==='testnet'&&cfg.chainId===1983)||(cfg.mode==='mainnet'&&cfg.chainId===1990))||!/^0x[0-9a-f]{40}$/i.test(cfg.registry))throw Error('Existing QIE deployment required');
await access(new URL('../dist/index.html',import.meta.url));
const middlewares=[];for(const plugin of [canarySnapshotPlugin(),canaryIdentityPlugin(),canaryProtocolsPlugin()])plugin.configureServer({middlewares:{use(fn){middlewares.push(fn)}}});
const server=createGateway({dist:fileURLToPath(new URL('../dist/',import.meta.url)),middlewares});
server.headersTimeout=10000;server.requestTimeout=20000;
const host=process.env.CANARY_HOST||'127.0.0.1';const port=Number(process.env.CANARY_PORT||5173);
if(!['127.0.0.1','0.0.0.0'].includes(host)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid gateway host or port');
server.listen(port,host,()=>console.log(`CANARY production gateway http://${host}:${port} | read-only server API | ${cfg.name}`));
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{server.close();server.closeIdleConnections();});
