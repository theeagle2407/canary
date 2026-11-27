import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {watchWalletSession} from '../src/lib/wallet-session.mjs';
const account='0xABC';
function fixture(){const raw=new EventEmitter();raw.request=async({method})=>method==='eth_accounts'?[account]:'0x7bf';let cleared=0;const off=watchWalletSession(raw,account,1983,()=>cleared++);return {raw,off,count:()=>cleared}}
test('same account and same chain do not invalidate',async()=>{const f=fixture();f.raw.emit('accountsChanged',['0xabc']);f.raw.emit('chainChanged','0x7bf');await new Promise(r=>setImmediate(r));assert.equal(f.count(),0);f.off()});
test('changed or revoked account invalidates once',()=>{for(const a of [[],['0xDEF']]){const f=fixture();f.raw.emit('accountsChanged',a);f.raw.emit('disconnect');assert.equal(f.count(),1);f.off()}});
test('changed chain or provider disconnect invalidates',()=>{for(const [event,value] of [['chainChanged','0x1'],['disconnect',null]]){const f=fixture();f.raw.emit(event,value);assert.equal(f.count(),1);f.off()}});
test('cleanup removes all listeners and suppresses late responses',async()=>{const f=fixture();f.off();f.raw.emit('accountsChanged',[]);await new Promise(r=>setImmediate(r));assert.equal(f.count(),0);assert.equal(f.raw.eventNames().length,0)});
