import {createServer} from 'node:http';
import {projectId,CanaryError} from '../sdk/canary.mjs';
export function createApiServer(client,{maxConcurrent=4}={}){
  let pending=0;
  return createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Accept');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
    const error=(status,code)=>send(status,{error:code,allFreshPass:false});
    if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
    if(req.method!=='GET'){res.setHeader('Allow','GET, OPTIONS');return error(405,'METHOD_NOT_ALLOWED');}
    const pathname=(req.url||'').split('?')[0];
    if(pathname==='/healthz')return send(200,{status:'ok',scope:'process-liveness'});
    const match=/^\/v1\/projects\/([^/?#]+)$/.exec(pathname);
    if(!match)return error(404,'NOT_FOUND');
    let id;try{id=projectId(match[1]);}catch{return error(400,'INVALID_INPUT');}
    if(pending>=maxConcurrent){res.setHeader('Retry-After','2');return error(429,'BUSY');}
    pending++;
    try{return send(200,await client.getProject(id));}
    catch(e){return e instanceof CanaryError&&e.code==='NOT_FOUND'?error(404,'NOT_FOUND'):error(503,'UNAVAILABLE');}
    finally{pending--;}
  });
}
