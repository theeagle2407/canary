import solc from 'solc';
import fs from 'node:fs';
export function compile(){
 const sources=Object.fromEntries(['Canary','DemoVault'].map(n=>[`${n}.sol`,{content:fs.readFileSync(new URL(`../contracts/${n}.sol`,import.meta.url),'utf8')}]));
 const input={language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
 const out=JSON.parse(solc.compile(JSON.stringify(input))); const errors=(out.errors||[]).filter(x=>x.severity==='error'); if(errors.length) throw new Error(errors.map(x=>x.formattedMessage).join('\n'));
 return Object.fromEntries(['Canary','DemoVault'].map(n=>{const c=out.contracts[`${n}.sol`][n];return [n,{abi:c.abi,bytecode:'0x'+c.evm.bytecode.object}]}));
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){const a=compile();fs.mkdirSync('artifacts',{recursive:true});for(const [n,v] of Object.entries(a)) fs.writeFileSync(`artifacts/${n}.json`,JSON.stringify(v,null,2)); console.log('Compiled Canary and DemoVault (Solidity 0.8.26, Paris).');}
