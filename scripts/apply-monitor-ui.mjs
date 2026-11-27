import {readFileSync,writeFileSync} from 'node:fs';
const path=new URL('../src/main.jsx',import.meta.url);
let s=readFileSync(path,'utf8');
const changes=[
 ['<div className="eyebrow"><span className="signal"/> QIE / EVM INFRASTRUCTURE</div>',''],
 ['Runs are manual in this release.','Runs can be manual or submitted by an independent monitoring process. The local worker records status transitions and refreshes aging results.'],
 ['<strong>QIE Mainnet <span>1990</span></strong>','<strong>{cfg.name} <span>{cfg.chainId}</span></strong>'],
 ['setInterval(()=>load(provider,selected),30000)','setInterval(()=>load(provider,selected),cfg.mode===\'local\'?5000:30000)']
];
for(const [a,b] of changes){if(s.includes(a))s=s.replace(a,b);else if(b&&!s.includes(b))throw Error('Unexpected frontend version: '+a);}
writeFileSync(path,s);
console.log('Applied monitoring copy, live network label and local refresh interval.');
