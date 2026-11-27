import {test} from 'node:test';import assert from 'node:assert/strict';import {word,coverage,scan,TARGETS} from '../scripts/qie-preflight.mjs';
const w=n=>'0x'+BigInt(n).toString(16).padStart(64,'0');
const block={hash:'0xabc',number:'0x123',timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};
function fake(chain='0x7c6',reorg=false){let blocks=0;return async(method,p)=>{switch(method){case 'eth_chainId':return chain;case 'eth_getBlockByNumber':return reorg&&blocks++>0?{...block,hash:'0xdef'}:block;case 'eth_getCode':return '0x6000';case 'eth_getBalance':return '0x64';case 'eth_call':assert.equal(p[1],block.number);if(p[0].data==='0x313ce567')return w(p[0].to===TARGETS.WQIE?18:6);if(p[0].data==='0x18160ddd')return w(100);throw Error('revert');default:throw Error('unexpected');}};}
test('exact ABI words and large values',()=>{assert.equal(word(w(2n**255n)),2n**255n);assert.throws(()=>word('0x01'));});
test('coverage comparison fails closed on zero supply or unit mismatch',()=>{assert.equal(coverage(100n,100n,18n),'passed');assert.equal(coverage(99n,100n,18n),'failed');assert.equal(coverage(0n,0n,18n),'unverified');assert.equal(coverage(100n,100n,6n),'unverified');});
test('mainnet snapshot with unsupported pause method',async()=>{const s=await scan(fake());assert.equal(s.tokens.WQIE.balanceVsReportedSupply,'passed');assert.equal(s.tokens.QUSDC.paused,null);assert.equal(s.registrationCandidates.length,1);assert.equal(s.kind,'rpc-preflight-not-registry-receipt');});
test('wrong network rejected',async()=>{await assert.rejects(scan(fake('0x7a')),/Wrong chain/);});
test('changed block rejected',async()=>{await assert.rejects(scan(fake('0x7c6',true)),/Block changed/);});
