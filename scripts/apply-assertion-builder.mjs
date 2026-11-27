import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const file=new URL('../src/main.jsx',import.meta.url);let s=readFileSync(file,'utf8');
if(s.includes('CANARY_ABI_BUILDER_V1')){console.log('Assertion builder already installed.');process.exit(0)}
function replace(old,next){if(s.split(old).length!==2)throw Error('Unexpected source: '+old.slice(0,100));s=s.replace(old,next)}
replace("import cfg from './deployment.json';","import AssertionForm from './components/AssertionForm.jsx';import './components/assertion-builder.css';import cfg from './deployment.json';");
replace('<Modal type={modal} close=', '<Modal provider={provider} type={modal} close=');
replace('function Modal({type,close,submit,busy})','// CANARY_ABI_BUILDER_V1\nfunction Modal({type,close,submit,busy,provider})');
const start=s.indexOf('<form onSubmit={e=>{e.preventDefault();submit(Object.fromEntries(new FormData(e.currentTarget)))}}>',s.indexOf('function Modal('));
const end=s.indexOf('</form>',start);if(start<0||end<0)throw Error('Modal source not recognized');
const projectForm='<form onSubmit={e=>{e.preventDefault();submit(Object.fromEntries(new FormData(e.currentTarget)))}}><label>Project name<input name="name" placeholder="Protocol name" maxLength={80} required/></label><button className="btn primary" type="submit" disabled={!!busy}>{busy?\'Confirming…\':\'Register on-chain\'} <ArrowRight size={16}/></button></form>';
s=s.slice(0,start)+"{type==='check'?<AssertionForm cfg={cfg} provider={provider} busy={busy} submit={submit}/>:"+projectForm+'}'+s.slice(end+7);
const backup=new URL('../src/main.jsx.before-abi-builder',import.meta.url);if(!existsSync(backup))writeFileSync(backup,readFileSync(file));writeFileSync(file,s);console.log('Assertion builder installed. No deployment files changed.');
