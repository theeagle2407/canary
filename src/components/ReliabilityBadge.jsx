import {projectLabel} from '../lib/product-labels.mjs';
import React,{useEffect,useState} from 'react';
import {Contract,JsonRpcProvider,ZeroAddress} from 'ethers';
import {displayStatus,validProjectId} from '../lib/reliability.mjs';

function deadline(p,ms=8000){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('RPC timeout')),ms)})]).finally(()=>clearTimeout(timer));}
export default function ReliabilityBadge({config,projectId}){
  const [snapshot,setSnapshot]=useState(null),[error,setError]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
  useEffect(()=>{
    if(!config.registry||!validProjectId(projectId)){setError(true);return;}
    let cancelled=false,timer,provider;
    async function read(){
      try{
        /* CANARY_SERVER_BADGE */
        if(!import.meta.env.DEV){
          const response=await fetch('/__canary/snapshot?publicId='+encodeURIComponent(projectId),{cache:'no-store',signal:AbortSignal.timeout(55000)});
          if(!response.ok)throw Error('Unavailable');const x=await response.json();if(String(x.active?.id)!==projectId||!Array.isArray(x.rows)||!Number.isSafeInteger(x.b?.timestamp))throw Error('Invalid snapshot');
          if(!cancelled){setSnapshot({checks:x.rows,name:x.active.name,blockTime:x.b.timestamp,block:x.b.number,fetchedAt:Date.now()});setError(false);setNow(Date.now());}return;
        }
        provider=new JsonRpcProvider(config.rpc);
        const snap=await deadline((async()=>{
          const network=await provider.send('eth_chainId',[]);
          if(BigInt(network)!==BigInt(config.chainId))throw Error('Wrong chain');
          const block=await provider.getBlock('latest');if(!block)throw Error('No block');
          const opts={blockTag:block.number};
          if(await provider.getCode(config.registry,block.number)==='0x')throw Error('No registry');
          const registry=new Contract(config.registry,config.abi,provider);
          const project=await registry.getProject(BigInt(projectId),opts);
          if(project.owner===ZeroAddress||project.checkIds.length>64)throw Error('Unknown project');
          const checks=[];
          for(let i=0;i<project.checkIds.length;i+=8){
            const batch=await Promise.all(project.checkIds.slice(i,i+8).map(id=>registry.getCheck(id,opts)));
            for(const c of batch){if(c.projectId!==BigInt(projectId))throw Error('Invalid check');checks.push({active:c.active,status:Number(c.status),checkedAt:Number(c.checkedAt),maxAge:Number(c.maxAge)});}
          }
          return {checks,name:project.name,blockTime:block.timestamp,block:block.number,fetchedAt:Date.now()};
        })());
        if(!cancelled){setSnapshot(snap);setError(false);setNow(Date.now());}
      }catch{if(!cancelled)setError(true);}
      finally{provider?.destroy();provider=null;if(!cancelled)timer=setTimeout(read,10000);}
    }
    read();return()=>{cancelled=true;clearTimeout(timer);provider?.destroy()};
  },[config,projectId]);
  const result=displayStatus(snapshot,now,error),status=!snapshot&&!error?'Checking…':result.status;
  const tone=status==='Checks passed'?'good':status==='Failed / error'?'bad':'muted';
  return <main className="reliability-badge-page"><a className="reliability-badge" href={`#/p/${projectId}`} target="_blank" rel="noopener noreferrer" aria-label={`Canary: ${status}. Open public report`}><div className="rb-top"><span className="rb-brand"><svg width="19" height="19" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 14h5l4-8 5 16 4-8h4" stroke="currentColor" strokeWidth="2.2"/></svg>canary</span><span className={`status ${tone}`} role="status"><span/>{status}</span></div><div className="rb-bottom"><span>{projectLabel(config,projectId,snapshot?.name)||'Project '+projectId}</span><span>{result.active?`${result.passed}/${result.active} fresh passes`:'No verified result'} · ↗</span></div><div className="rb-meta">{config.name} · {snapshot&&!error?`Block ${snapshot.block}`:'No current evidence'}</div></a></main>;
}
export function BadgeEmbed({projectId}){
  const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
  const url=new URL(window.location.pathname,window.location.origin);url.hash=`/badge/${projectId}`;
  const snippet=`<iframe src="${url.href.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}" title="CANARY reliability checks" width="350" height="108" style="border:0;max-width:100%" loading="lazy"></iframe>`;
  async function copy(){try{await navigator.clipboard.writeText(snippet);setCopied(true);setCopyError(false)}catch{setCopyError(true)}}
  return <section className="panel badge-embed-panel"><div className="panel-head"><div><h2>Reliability badge</h2><p>Embed recorded check status in your application.</p></div><a className="btn outline small" href={url.href} target="_blank" rel="noopener noreferrer">Open badge ↗</a></div><div className="badge-embed-body"><iframe title="Live reliability badge preview" src={url.href} width="350" height="108" style={{border:0,maxWidth:'100%'}}/><div className="badge-embed-code"><label htmlFor="badge-snippet">HTML embed</label><textarea id="badge-snippet" readOnly value={snippet} rows={4} onFocus={e=>e.target.select()}/><div className="badge-copy-row"><button className="btn outline small" onClick={copy}>{copied?'Copied':'Copy embed'}</button>{copyError&&<span role="status">Select and copy the code manually.</span>}<a className="text-button" href={`./canary-embed-test.html?project=${projectId}`} target="_blank" rel="noopener noreferrer">Test embed ↗</a></div></div></div><div className="incident-note">Recorded checks only. Not a security audit. {window.location.hostname==='localhost'||window.location.hostname==='127.0.0.1'?'Local preview; use a hosted CANARY URL for public embeds.':''}</div></section>;
}
