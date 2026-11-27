import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../src/main.jsx',import.meta.url), css=new URL('../src/styles.css',import.meta.url);
let s=readFileSync(file,'utf8'), styles=readFileSync(css,'utf8');
const changes=[
 ["import './styles.css';", "import './styles.css';import Incidents from './components/Incidents.jsx';"],
 ['<div className="panel"><div className="panel-head"><div><h2>Evidence</h2>', '<Incidents key={project.id} provider={provider} config={cfg} projectId={project.id} block={block} checks={checks}/><div className="panel"><div className="panel-head"><div><h2>Evidence</h2>'],
 ['No real deposits. Change the vault state, then run its check again.', 'Change the vault state to test failure and recovery.'],
];
for(const [a,b] of changes){if(s.includes(b))continue;if(!s.includes(a))throw Error('Unexpected frontend version: '+a);s=s.replace(a,b);}
const style='\n/* Canary incident history */\n.incident-controls{display:flex;align-items:center;gap:8px}.incident-controls select{background:#191f28;color:#dce2eb;border:1px solid var(--line);padding:6px 9px;border-radius:4px;font-size:12px}.incident-note{padding:10px 17px;border-top:1px solid var(--line);font-size:11px;line-height:1.5;color:var(--muted);overflow-wrap:anywhere}.incident-tx{color:inherit;text-decoration:underline;text-underline-offset:3px}.incident-panel td small{max-width:240px;overflow:hidden;text-overflow:ellipsis}.incident-panel td{vertical-align:top}\n';
if(!styles.includes('/* Canary incident history */'))styles+=style;
writeFileSync(file,s);writeFileSync(css,styles);console.log('Incident history installed. Existing deployment unchanged.');
