import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {patchLanding} from '../scripts/apply-console-entry.mjs';
import {patchMain} from '../scripts/apply-wallet-picker.mjs';
const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
const landing=await readFile(new URL('../src/components/ProductLanding.jsx',import.meta.url),'utf8');
test('all three landing console CTAs request wallet entry; public report remains unchanged',()=>{
 const s=patchLanding(landing);assert.equal((s.match(/href="#\/app" onClick=\{onOpenConsole\}/g)||[]).length,3);assert.ok(s.includes("href={report||'#/protocols'}"));assert.equal(patchLanding(s),s);
});
test('footer sentence removed without changing network label',()=>{const s=patchLanding(landing);assert.ok(!s.includes('Configured checks are not a security audit or guarantee of future behavior.'));assert.ok(s.includes("{config?.name||'QIE'}"));});
test('landing opens selector before console; successful selection navigates and active session skips prompt',()=>{
 const s=patchMain(main);assert.ok(s.includes('if(account&&wallet)enterConsole();else showPicker(true);'));assert.ok(s.includes('setPicker(null);if(enter)enterConsole();'));assert.ok(s.includes('await authorizeWallet(choice.provider,cfg'));assert.ok(!s.includes('consoleConnectIntent'));assert.ok(s.includes('onClick={account?disconnect:openWalletPicker}'));assert.equal(patchMain(s),s);
});
test('unexpected input fails closed',()=>{assert.throws(()=>patchMain('unknown'));assert.throws(()=>patchLanding('unknown'));});
