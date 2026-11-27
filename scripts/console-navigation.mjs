export function replaceOnce(source,before,after,file='source'){
 if(source.includes(after)) return source;
 if(source.split(before).length!==2)throw Error(`${file}: expected exactly one matching fragment: ${before}`);
 return source.replace(before,()=>after);
}
export const navSource=`import React from 'react';
import {Layers,Radio,Bell,BookOpen,ArrowUpRight} from 'lucide-react';
const entries=[['app','Overview',Layers],['infrastructure','Infrastructure',Radio],['notifications','Notifications',Bell]];
export default function ConsoleNav({active,onNavigate}){return <nav className="console-nav" aria-label="Console"><div className="workspace-label">CONSOLE</div>{entries.map(([id,label,Icon])=><a key={id} href={'#/'+id} className={'nav-item'+(active===id?' active':'')} aria-current={active===id?'page':undefined} onClick={onNavigate}><Icon size={18} aria-hidden="true"/>{label}</a>)}</nav>}
export function ConsoleDocumentation({onNavigate}){return <nav aria-label="Resources" className="sidebar-resources"><a className="nav-item" href="#/docs" onClick={onNavigate}><BookOpen size={18} aria-hidden="true"/>Documentation<ArrowUpRight size={14} aria-hidden="true"/></a></nav>}
`;
export function patchSidebar(source,file){
 let next=source;
 const main=file==='src/main.jsx';
 const from=main?'./components/ConsoleNav.jsx':'./ConsoleNav.jsx';
 next=replaceOnce(next,`import ConsoleNav from '${from}';`,`import ConsoleNav, {ConsoleDocumentation} from '${from}';`,file);
 const prefix='<div className="sidebar-end">';
 const wrapper='<div className="sidebar-bottom"><ConsoleDocumentation'+(main?' onNavigate={()=>setSide(false)}':'')+'/>'+prefix;
 if(!next.includes(wrapper)){
  if(next.split(prefix).length!==2||next.split('</div></aside>').length!==2)throw Error(file+': sidebar markup differs; no changes made');
  next=next.replace(prefix,()=>wrapper).replace('</div></aside>','</div></div></aside>');
 }
 if(main)next=replaceOnce(next,'<h2>Limitations</h2>','<h2>Explore protocols</h2><p>Inspect live token and pool observations and copy assertion templates. These read-only observations are distinct from recorded CANARY verification receipts.</p><p><a className="btn outline" href="#/protocols">Explore protocols <ArrowUpRight size={15}/></a></p><h2>Limitations</h2>',file);
 return next;
}
export const cssPatch=`\n/* CANARY sidebar resources */\n.sidebar-bottom{margin-top:auto;flex-shrink:0}\n.sidebar-bottom .sidebar-end{margin-top:0}\n.sidebar-resources{padding:0 0 12px}\n.sidebar-resources .nav-item:hover{background:var(--canary-hover);color:var(--canary-text)}\n`;
export function patchCSS(source){return source.includes('/* CANARY sidebar resources */')?source:source+cssPatch;}
