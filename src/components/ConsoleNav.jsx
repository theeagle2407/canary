import React from 'react';
import {Layers,Radio,Bell,BookOpen,ArrowUpRight} from 'lucide-react';
const entries=[['app','Overview',Layers],['infrastructure','Infrastructure',Radio],['notifications','Notifications',Bell]];
export default function ConsoleNav({active,onNavigate}){return <nav className="console-nav" aria-label="Console"><div className="workspace-label">CONSOLE</div>{entries.map(([id,label,Icon])=><a key={id} href={'#/'+id} className={'nav-item'+(active===id?' active':'')} aria-current={active===id?'page':undefined} onClick={onNavigate}><Icon size={18} aria-hidden="true"/>{label}</a>)}</nav>}
export function ConsoleDocumentation({onNavigate}){return <nav aria-label="Resources" className="sidebar-resources"><a className="nav-item" href="#/docs" onClick={onNavigate}><BookOpen size={18} aria-hidden="true"/>Documentation<ArrowUpRight size={14} aria-hidden="true"/></a></nav>}
