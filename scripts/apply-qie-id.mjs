import {readFileSync,writeFileSync} from 'node:fs';
const main=new URL('../src/main.jsx',import.meta.url),vite=new URL('../vite.config.js',import.meta.url),pkg=new URL('../package.json',import.meta.url);
let s=readFileSync(main,'utf8'),v=readFileSync(vite,'utf8'),p=JSON.parse(readFileSync(pkg,'utf8'));
function sub(a,old,next){if(a.includes(next))return a;if(a.split(old).length!==2)throw Error('Unexpected source: '+old.slice(0,100));return a.replace(old,next)}
if(!s.includes("import QieIdentity from './components/QieIdentity.jsx';"))s="import QieIdentity from './components/QieIdentity.jsx';\n"+s;
s=sub(s,"<p>{project?`Project #${project.id} · ${short(project.owner)}`:'Registered assertions and execution evidence.'}</p>","<p>{project?`Project #${project.id} · ${short(project.owner)}`:'Registered assertions and execution evidence.'}{project&&<QieIdentity key={`${cfg.chainId}:${project.owner}`} owner={project.owner} chainId={cfg.chainId}/>}</p>");
if(!v.includes("import {canaryIdentityPlugin}"))v="import {canaryIdentityPlugin} from './scripts/qie-id-plugin.mjs';\n"+v;
v=sub(v,'plugins:[canarySnapshotPlugin(),','plugins:[canaryIdentityPlugin(),canarySnapshotPlugin(),');p.scripts['qie:id']='node scripts/qie-id.mjs';
writeFileSync(main,s);writeFileSync(vite,v);writeFileSync(pkg,JSON.stringify(p,null,2)+'\n');console.log('QIE ID integration installed. Deployment unchanged.');
