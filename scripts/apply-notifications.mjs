import {readFileSync,writeFileSync} from 'node:fs';
const main=new URL('../src/main.jsx',import.meta.url),infra=new URL('../src/components/Infrastructure.jsx',import.meta.url),pkg=new URL('../package.json',import.meta.url);
let s=readFileSync(main,'utf8'),i=readFileSync(infra,'utf8'),p=JSON.parse(readFileSync(pkg,'utf8'));
function sub(source,a,b){if(source.includes(b))return source;if(source.split(a).length!==2)throw Error('Unexpected source: '+a.slice(0,100));return source.replace(a,b)}
s=sub(s,"import Infrastructure from './components/Infrastructure.jsx';","import Infrastructure from './components/Infrastructure.jsx';import Notifications from './components/Notifications.jsx';import {Bell as NotificationBell} from 'lucide-react';");
s=sub(s,"if(route==='#/infrastructure')return <Infrastructure Logo={Logo}/>;","if(route==='#/infrastructure')return <Infrastructure Logo={Logo}/>;if(route==='#/notifications')return <Notifications Logo={Logo}/>;");
s=sub(s,'<a className="nav-item" href="#/infrastructure"><Radio size={18}/> Infrastructure</a>','<a className="nav-item" href="#/infrastructure"><Radio size={18}/> Infrastructure</a><a className="nav-item" href="#/notifications"><NotificationBell size={18}/> Notifications</a>');
i=sub(i,'<a className="nav-item" href="#/docs">Developer guide</a>','<a className="nav-item" href="#/notifications">Notifications</a><a className="nav-item" href="#/docs">Developer guide</a>');
p.scripts.notifications='node scripts/notifications.mjs';
writeFileSync(main,s);writeFileSync(infra,i);writeFileSync(pkg,JSON.stringify(p,null,2)+'\n');console.log('Notifications installed. Deployment unchanged.');
