export function summarizeChecks(checks, now) {
  const active=checks.filter(c=>c.active);
  const counts={active:active.length,passed:0,failed:0,stale:0,unverified:0};
  for(const c of active){
    const status=Number(c.status), checkedAt=Number(c.checkedAt), maxAge=Number(c.maxAge);
    if(status===0){counts.unverified++;continue;}
    if(![1,2,3].includes(status)||!Number.isSafeInteger(checkedAt)||checkedAt<=0||!Number.isSafeInteger(maxAge)||maxAge<=0||checkedAt>now){counts.unverified++;continue;}
    if(now>checkedAt+maxAge){counts.stale++;continue;}
    if(status===1)counts.passed++;else counts.failed++;
  }
  const status=counts.failed?'Failed / error':counts.stale?'Stale':counts.unverified||!counts.active?'Unverified':'Checks passed';
  return {...counts,status};
}
export function validProjectId(value){return typeof value==='string'&&/^[1-9][0-9]{0,77}$/.test(value)&&BigInt(value)<2n**256n;}
export function displayStatus(snapshot, nowMs, unavailable=false){
  if(unavailable||!snapshot||nowMs-snapshot.fetchedAt>25000||nowMs<snapshot.fetchedAt-1000)return {status:'Unavailable',active:0,passed:0};
  return summarizeChecks(snapshot.checks,Math.max(snapshot.blockTime,Math.floor(nowMs/1000)));
}
