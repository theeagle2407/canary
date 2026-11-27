import test from 'node:test';import assert from 'node:assert/strict';
import {allowedRpc,feeCeiling,TESTNET_CHAIN} from '../scripts/testnet-guard.mjs';
test('only selected official testnet URLs accepted',()=>{assert.equal(TESTNET_CHAIN,1983n);assert.equal(allowedRpc('https://rpc5testnet.qie.digital'),true);assert.equal(allowedRpc('https://rpc1mainnet.qie.digital'),false);});
test('fee ceiling enforces budget and reserve',()=>{assert.equal(feeCeiling(5n,2n,0n,10n,12n,2n),10n);assert.throws(()=>feeCeiling(5n,2n,1n,10n,12n,2n),/budget/);assert.throws(()=>feeCeiling(5n,2n,0n,10n,11n,2n),/reserve/);assert.throws(()=>feeCeiling(5n,0n,0n,10n,12n,2n),/Invalid/);});
