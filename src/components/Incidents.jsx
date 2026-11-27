import React,{useEffect,useState} from 'react';
import {Contract} from 'ethers';
import {deriveIncidents,recordedDuration} from '../lib/incidents.mjs';
const MAX_BLOCKS=20000, PAGE=1000;
const time=t=>new Date(t*1000).toLocaleString();
const short=t=>`${t.slice(0,8)}…${t.slice(-4)}`;
function Tx({event,config}){return config.explorer?<a className="incident-tx mono" title={event.tx} href={`${config.explorer}/tx/${event.tx}`} target="_blank" rel="noreferrer">{short(event.tx)} ↗</a>:<code title={event.tx}>{short(event.tx)}</code>}
export default function Incidents({provider,config,projectId,block,checks}){
  const [snapshot,setSnapshot]=useState(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[filter,setFilter]=useState('All');
  useEffect(()=>{
    if(!provider||!projectId||!block)return;
    let cancelled=false;
    async function scan(){
      try{
        setError('');
        const c=new Contract(config.registry,config.abi,provider);
        const start=Math.max(config.deploymentBlock,block-MAX_BLOCKS+1), events=[];
        for(let from=start;from<=block;from+=PAGE){
          const to=Math.min(block,from+PAGE-1);
          const [runs,retired]=await Promise.all([c.queryFilter(c.filters.CheckExecuted(BigInt(projectId)),from,to),c.queryFilter(c.filters.CheckRetired(BigInt(projectId)),from,to)]);
          if(cancelled)return;
          for(const e of runs)events.push({kind:'run',id:String(e.args.checkId),status:Number(e.args.status),observed:String(e.args.observed),time:Number(e.args.checkedAt),block:e.blockNumber,log:e.index,tx:e.transactionHash});
          for(const e of retired){const b=await provider.getBlock(e.blockNumber);if(!b)throw Error('Retirement block unavailable');events.push({kind:'retire',id:String(e.args.checkId),time:b.timestamp,block:e.blockNumber,log:e.index,tx:e.transactionHash});}
          if(cancelled)return;
        }
        if(!cancelled)setSnapshot({projectId,block,start,complete:start===config.deploymentBlock,incidents:deriveIncidents(events)});
      }catch(e){if(!cancelled)setError(e.shortMessage||e.message||String(e));}
    }
    scan();return()=>{cancelled=true};
  },[provider,config,projectId,block,attempt]);
  const data=snapshot?.projectId===projectId?snapshot:null;
  const incidents=data?.incidents||[], rows=incidents.filter(i=>filter==='All'||i.state===filter);
  const checkName=id=>checks.find(c=>String(c.id)===id)?.name||`Check #${id}`;
  return <section className="panel incident-panel" id="incidents"><div className="panel-head"><div><h2>Incidents {data&&<small>{incidents.length}</small>}</h2><p>{data?`Recorded events · blocks ${data.start.toLocaleString()}–${data.block.toLocaleString()}`:'On-chain event history'}</p></div><div className="incident-controls"><select aria-label="Filter incidents" value={filter} onChange={e=>setFilter(e.target.value)}>{['All','Open','Recovered','Retired'].map(f=><option key={f}>{f}</option>)}</select><button className="btn outline small" onClick={()=>setAttempt(x=>x+1)}>Refresh</button></div></div>
    {error&&<div className="incident-note" role="alert">History query failed. {data?'Showing last successful scan.':'Incident history unavailable.'} {error}</div>}
    {data&&!data.complete&&<div className="incident-note">Showing the last {MAX_BLOCKS.toLocaleString()} blocks. Earlier incidents may be missing; start times are first observed within this range.</div>}
    {data&&data.block!==block&&<div className="incident-note">Updating history. Results are through block {data.block}.</div>}
    {!data&&!error&&<div className="table-empty">Loading incident history…</div>}
    {data&&(rows.length?<div className="table-scroll"><table><thead><tr><th>Condition</th><th>Status</th><th>First recorded</th><th>Resolution</th><th>Recorded interval</th></tr></thead><tbody>{rows.map(i=><tr key={`${i.start.tx}:${i.start.log}`}><td><b>{checkName(i.id)}</b><small>#{i.id} · {i.failures} failed/error {i.failures===1?'record':'records'}</small></td><td><span className={`status ${i.state==='Open'?'bad':i.state==='Recovered'?'good':'muted'}`}><span/>{i.state}</span><small>{i.latest.status===3?'Call error':`Observed ${i.latest.observed}`}</small></td><td>{time(i.start.time)}<small><Tx event={i.start} config={config}/> · #{i.start.block}</small></td><td>{i.end?<>{time(i.end.time)}<small><Tx event={i.end} config={config}/> · #{i.end.block}</small></>:'Unresolved'}</td><td className="mono">{i.end?recordedDuration(i.start.time,i.end.time):'—'}</td></tr>)}</tbody></table></div>:<div className="table-empty">{filter==='All'?'No failed or error executions recorded in this range.':'No matching incidents in this range.'}</div>)}
    <div className="incident-note">Intervals measure recorded events, not actual downtime. Retiring a check does not establish recovery.</div>
  </section>;
}
