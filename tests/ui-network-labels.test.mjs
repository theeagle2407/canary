import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {replacements,cleanLabel} from '../scripts/ui-network-labels.mjs';
test('all five visible labels removed and edits idempotent',()=>{
 for(const [file,before,after] of replacements){const s='prefix'+before+'suffix';const a=cleanLabel(s,before,after);assert.equal(a,'prefix'+after+'suffix',file);assert.equal(cleanLabel(a,before,after),a);}
});
test('does not alter chain validation or read-only disclosure',()=>{
 const s='if(d.chainId!==1990)throw Error();<small>Chain 1990 · read-only</small>';
 assert.equal(cleanLabel(s,replacements[3][1],replacements[3][2]),'if(d.chainId!==1990)throw Error();<small>Read-only</small>');
});
test('unexpected or duplicate matching labels rejected',()=>{
 assert.throws(()=>cleanLabel('unknown',replacements[3][1],replacements[3][2]));
 assert.throws(()=>cleanLabel('XX','X',''));
});
test('active frontend files contain no old display labels after patch',async()=>{
 for(const [file,before,after] of replacements){const s=await readFile(new URL('../'+file,import.meta.url),'utf8');assert.ok(!s.includes(before),file);if(after)assert.ok(s.includes(after),file);}
});
