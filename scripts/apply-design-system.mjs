import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {migrateCss} from './design-system.mjs';
const root=new URL('../',import.meta.url);
const files=['src/styles.css','src/components/product-landing.css','src/components/assertion-builder.css','src/components/protocol-console.css'];
const changes=files.map((name,i)=>{const file=new URL(name,root);const before=readFileSync(file,'utf8');if(!before.trim())throw Error('Empty stylesheet: '+name);if(i===0&&!before.includes(':root'))throw Error('Unexpected base stylesheet');if(i===1&&!before.includes('.canary-home'))throw Error('Install Build 20 first');return {file,before,after:migrateCss(before,{root:i===0})};});
for(const {file,before,after} of changes){if(before===after)continue;const backup=new URL(file.href+'.before-design-system');if(!existsSync(backup))writeFileSync(backup,before);writeFileSync(file,after);}
console.log('Shared CANARY design system applied to all four stylesheets. No contracts, JSX, deployment or worker files changed.');
