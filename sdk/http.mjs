// HTTP SDK: throws on network/API failure. A previously fetched pass is not a live guarantee.
import {projectId,CanaryError} from './canary.mjs';
export function createCanaryHttp(baseUrl,{timeoutMs=12000,fetcher=globalThis.fetch}={}){
  const base=new URL(baseUrl);if(!['http:','https:'].includes(base.protocol))throw new Error('HTTP(S) API URL required');
  return {async getProject(id){
    id=projectId(id);const url=new URL(`/v1/projects/${id}`,base);
    try {
      const r=await fetcher(url,{signal:AbortSignal.timeout(timeoutMs),cache:'no-store',headers:{Accept:'application/json'}});
      if(!r.ok)throw new CanaryError(r.status===404?'NOT_FOUND':'UNAVAILABLE',r.status===404?'Project not found':'API evidence unavailable');
      const body=await r.json();if(body.schemaVersion!==1||body.project?.id!==id||!['passed','failed','stale','unverified'].includes(body.state)||body.allFreshPass!==(body.state==='passed'))throw new Error('Invalid response');
      return body;
    }catch(e){if(e instanceof CanaryError)throw e;throw new CanaryError('UNAVAILABLE','API evidence unavailable');}
  }};
}
