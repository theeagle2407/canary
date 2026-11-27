import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { Contract, JsonRpcProvider, isAddress } from 'ethers';
import { publicationReason, statusName } from './monitor-policy.mjs';

const config = JSON.parse(await readFile(new URL('../src/deployment.json', import.meta.url), 'utf8'));
if (config.mode !== 'local' || config.chainId !== 31337 || config.rpc !== 'http://127.0.0.1:8545') {
  throw new Error('Build 03 monitor is local-only. No live-network transactions are permitted.');
}
if (!isAddress(config.registry) || !Array.isArray(config.abi) || !config.abi.length) throw new Error('Deploy Canary locally first.');
const pollMs = Number(process.env.CANARY_POLL_MS ?? 5000);
if (!Number.isInteger(pollMs) || pollMs < 2000 || pollMs > 60000) throw new Error('CANARY_POLL_MS must be 2000–60000.');
const once = process.argv.includes('--once');
const provider = new JsonRpcProvider(config.rpc);
let stopped = false;
const stop = () => { stopped = true; };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const log = (msg) => console.log(`${new Date().toISOString()} ${msg}`);
let failed = false;
try {
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) throw new Error('Unexpected chain ID.');
  if (await provider.getCode(config.registry) === '0x') throw new Error('Registry missing. Did the local chain restart?');
  const signer = await provider.getSigner(1);
  const registry = new Contract(config.registry, config.abi, signer);
  log(`MONITOR START | chain=${network.chainId} | registry=${config.registry} | runner=${await signer.getAddress()}`);
  do {
    let scanned=0, published=0, errors=0;
    try {
      const count = await registry.checkCount();
      if (count > 1000n) throw new Error('Local worker supports up to 1000 registered checks; use a paginated worker for larger deployments.');
      for (let id=1n; id<=count && !stopped; id++) {
        try {
          const check = await registry.getCheck(id);
          if (!check.active) continue;
          scanned++;
          const [liveStatus] = await registry.evaluate.staticCall(id, {gasLimit:500000});
          const latest = await provider.getBlock('latest');
          if (!latest) throw new Error('Latest block unavailable');
          // Ganache can sit idle with no new blocks; wall time is used only to
          // schedule a local refresh. The contract timestamps the actual result.
          const now = Math.max(latest.timestamp, Math.floor(Date.now()/1000));
          const reason = publicationReason(check, liveStatus, now);
          if (!reason) continue;
          const tx = await registry.run(id, {gasLimit:500000});
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) throw new Error('Execution transaction not confirmed');
          const event = receipt.logs.filter(l => l.address.toLowerCase() === config.registry.toLowerCase()).map(l=>{try{return registry.interface.parseLog(l)}catch{return null}}).find(l=>l?.name==='CheckExecuted' && l.args.checkId===id);
          if (!event) throw new Error('Confirmed receipt missing CheckExecuted event');
          published++;
          const result = statusName(event.args.status);
          const before = statusName(check.status);
          const label = before==='PASS' && ['FAIL','ERROR'].includes(result) ? 'INCIDENT' : ['FAIL','ERROR'].includes(before) && result==='PASS' ? 'RECOVERY' : 'RECORDED';
          log(`${label} | check=${id} | ${before} -> ${result} | reason=${reason} | observed=${event.args.observed} | block=${receipt.blockNumber} | tx=${receipt.hash}`);
        } catch (err) {
          errors++; log(`CHECK ERROR | check=${id} | ${err.shortMessage || err.message}`);
        }
      }
    } catch (err) { errors++; log(`SCAN ERROR | ${err.shortMessage || err.message}`); }
    log(`SCAN | active=${scanned} | published=${published} | errors=${errors}`);
    if (once) { failed = errors > 0; break; }
    if (!stopped) await delay(pollMs);
  } while (!stopped);
} finally {
  await provider.destroy();
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
}
if (failed) process.exitCode = 1;
