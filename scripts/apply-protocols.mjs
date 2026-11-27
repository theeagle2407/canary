import {readFileSync,writeFileSync} from 'node:fs';
const files=['src/main.jsx','src/components/Infrastructure.jsx','src/components/Notifications.jsx','vite.config.js'];const paths=files.map(x=>new URL('../'+x,import.meta.url));let [s,i,n,v]=paths.map(x=>readFileSync(x,'utf8'));
function sub(a,old,next){if(a.includes(next))return a;if(a.split(old).length!==2)throw Error('Unexpected source: '+old);return a.replace(old,next)}
if(!s.includes("import Protocols from"))s="import Protocols from './components/Protocols.jsx';\n"+s;
s=sub(s,"if(route==='#/notifications')return <Notifications Logo={Logo}/>;","if(route==='#/notifications')return <Notifications Logo={Logo}/>;if(route==='#/protocols')return <Protocols Logo={Logo}/>;");
const link='<a className="nav-item" href="#/protocols">Protocols</a>';
s=sub(s,'<NotificationBell size={18}/> Notifications</a>','<NotificationBell size={18}/> Notifications</a>'+link);
for(const key of ['i','n']){if(key==='i')i=sub(i,'<a className="nav-item" href="#/docs">Developer guide</a>',link+'<a className="nav-item" href="#/docs">Developer guide</a>');else n=sub(n,'<a className="nav-item" href="#/docs">Developer guide</a>',link+'<a className="nav-item" href="#/docs">Developer guide</a>')}
if(!v.includes('import {canaryProtocolsPlugin}'))v="import {canaryProtocolsPlugin} from './scripts/protocols-plugin.mjs';\n"+v;
v=sub(v,'plugins:[canaryIdentityPlugin(),','plugins:[canaryProtocolsPlugin(),canaryIdentityPlugin(),');[s,i,n,v].forEach((x,j)=>writeFileSync(paths[j],x));console.log('Protocols installed. Existing deployment unchanged.');
