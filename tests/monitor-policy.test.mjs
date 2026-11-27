import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicationReason,statusName} from '../scripts/monitor-policy.mjs';
const base={active:true,status:1n,checkedAt:1000n,maxAge:60n};
test('unverified and changed statuses publish immediately',()=>{
 assert.equal(publicationReason({...base,status:0n},1n,1001),'initial');
 assert.equal(publicationReason(base,2n,1001),'transition');
 assert.equal(publicationReason({...base,status:2n},1n,1001),'transition');
 assert.equal(publicationReason(base,3n,1001),'transition');
});
test('unchanged checks refresh at 80 percent of max age, not each poll',()=>{
 assert.equal(publicationReason(base,1n,1047),null);
 assert.equal(publicationReason(base,1n,1048),'refresh');
 assert.equal(publicationReason({...base,status:2n},2n,1048),'refresh');
});
test('retired checks ignored and status names preserved',()=>{
 assert.equal(publicationReason({...base,active:false},2n,2000),null);
 assert.equal(statusName(3n),'ERROR');
});
