import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url),file=new URL('src/main.jsx',root),old=readFileSync(file,'utf8');
if(old.includes('CANARY_LANDING_REFRESH')){console.log('Landing refresh already installed.');process.exit(0)}
const pattern=/^function Landing\(\)\{[^\n]*\}\s*$/m;
if(!pattern.test(old))throw Error('Landing component differs from expected source; no existing files changed.');
const next='// CANARY_LANDING_REFRESH\nimport ProductLanding from \'./components/ProductLanding.jsx\';\n'+old.replace(pattern,'function Landing(){return <ProductLanding Logo={Logo} config={cfg}/>;}');
const backup=new URL(file.href+'.before-landing-refresh');if(!existsSync(backup))writeFileSync(backup,old);writeFileSync(file,next);console.log('Landing refreshed. Console, deployment and worker files unchanged.');
