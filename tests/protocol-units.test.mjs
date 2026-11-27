import test from 'node:test';import assert from 'node:assert/strict';import {toRawUnits} from '../scripts/protocol-units.mjs';
test('human token amounts encode exactly',()=>{assert.equal(toRawUnits('500.25',6),'500250000');assert.equal(toRawUnits('0.000000000000000001',18),'1');assert.equal(toRawUnits('28733.000132026516114645',18),'28733000132026516114645')});
test('rejects unsafe or invalid amounts',()=>{for(const [v,d] of [['0',6],['-1',6],['1e3',6],['0.0000001',6],['1.5',0],[(2n**256n).toString(),0]])assert.throws(()=>toRawUnits(v,d))});
