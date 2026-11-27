import test from 'node:test';
import assert from 'node:assert/strict';
import {readEndpoints,readWithFailover} from '../src/lib/read-failover.mjs';
test('testnet endpoints deduplicate, no cross-chain fallback',()=>{
 const a='https://rpc5testnet.qie.digital',b='https://rpc4testnet.qie.digital';
 assert.deepEqual(readEndpoints({rpc:a,mode:'testnet',chainId:1983}),[a,b]);
 assert.deepEqual(readEndpoints({rpc:'local',mode:'local',chainId:31337}),['local']);
 assert.deepEqual(readEndpoints({rpc:'main',mode:'mainnet',chainId:1990}),['main']);
});
test('503 restarts entire read on alternate endpoint',async()=>{
 const calls=[];const value=await readWithFailover(['a','b'],async ep=>{calls.push(ep);if(ep==='a')throw Error('503');return {block:42,projects:[1]}});
 assert.deepEqual(calls,['a','b']);assert.deepEqual(value,{block:42,projects:[1]});
});
test('timed-out read aborted, next endpoint used',async()=>{
 let aborted=false; const value=await readWithFailover(['a','b'],(ep,signal)=>ep==='a'?new Promise(()=>{signal.addEventListener('abort',()=>{aborted=true})}):Promise.resolve(42),{timeout:15});assert.equal(aborted,true);assert.equal(value,42);
});
test('both failed rejects rather than returning empty data',async()=>{
 await assert.rejects(readWithFailover(['a','b'],async()=>{throw Error('503')}),/Network data unavailable/);
});
