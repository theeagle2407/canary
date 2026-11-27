import {test} from 'node:test';import assert from 'node:assert/strict';import {examples,exampleResult,projectReport} from '../src/lib/landing-examples.mjs';
test('illustrative cases pass and fail by actual comparison',()=>{for(const x of examples){assert.equal(exampleResult(x.id).pass,true);assert.equal(exampleResult(x.id,true).pass,false);}});
test('reject unknown scenario',()=>assert.throws(()=>exampleResult('missing')));
test('only configured registry project links are offered',()=>{const registry='0x'+'a'.repeat(40);assert.equal(projectReport({registry,demoProject:1}),'#/p/1');assert.equal(projectReport({registry,demoProject:'../1'}),null);assert.equal(projectReport({registry:'',demoProject:1}),null);});
