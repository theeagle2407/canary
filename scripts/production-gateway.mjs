import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const json=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
export function createGateway({dist,middlewares=[],fetcher=fetch,limit=8}={}){
 const root=realpathSync(resolve(dist));let active=0;
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  try{
   const raw=req.url||'/';if(!raw.startsWith('/')||raw.startsWith('//')||raw.length>2048)return json(res,400,{error:'INVALID_PATH'});
   const u=new URL(raw,'http://localhost');const path=u.pathname;
   // Public gateway has no administrative mutations, arbitrary proxy or signing endpoints.
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'READ_ONLY'});
   if(path==='/healthz')return json(res,200,{status:'ok',scope:'gateway-liveness'});
   const target=path==='/v1/infrastructure'?8788:path==='/v1/notifications'?8790:/^\/v1\/projects\/[1-9][0-9]{0,77}$/.test(path)?8787:null;
   const internal=['/__canary/snapshot','/api/canary/identity','/api/canary/protocols'].includes(path);
   if(target||internal){
    if(req.method!=='GET')return json(res,405,{error:'GET_REQUIRED'});
    if(active>=limit){res.setHeader('Retry-After','5');return json(res,429,{error:'BUSY',allFreshPass:false});}
    active++;let released=false;const release=()=>{if(!released){released=true;active--;}};res.once('finish',release);res.once('close',release);
    if(target){try{const r=await fetcher(`http://127.0.0.1:${target}${path}`,{redirect:'error',signal:AbortSignal.timeout(20000)});const value=await r.json();if(path==='/v1/notifications'&&r.ok){delete value.settings;delete value.lastTest;delete value.destination;value.destination='Operator managed';}if(target===8787)res.setHeader('Access-Control-Allow-Origin','*');return json(res,r.status,value);}catch{return json(res,503,{error:'SERVICE_UNAVAILABLE',allFreshPass:false});}}
    let i=0;const next=()=>{const fn=middlewares[i++];if(!fn)return json(res,404,{error:'NOT_FOUND'});return Promise.resolve(fn(req,res,next));};return await next();
   }
   if(path.startsWith('/api/')||path.startsWith('/v1/')||path.startsWith('/__'))return json(res,404,{error:'NOT_FOUND'});
   // Serve only files from the compiled distribution. No source, dotfiles, or directories.
   const decoded=decodeURIComponent(path);if(decoded.includes('\\')||decoded.split('/').some(x=>x.startsWith('.')))return json(res,404,{error:'NOT_FOUND'});
   const name=decoded==='/'?'/index.html':decoded;const candidate=resolve(root,'.'+name);if(!candidate.startsWith(root+sep))return json(res,404,{error:'NOT_FOUND'});
   let file;try{file=await realpath(candidate);if(!file.startsWith(root+sep)||!(await stat(file)).isFile())throw Error();}catch{return json(res,404,{error:'NOT_FOUND'});}
   const ext=file.slice(file.lastIndexOf('.'));if(!types[ext])return json(res,404,{error:'NOT_FOUND'});
   const body=await readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Content-Length':body.length,'Cache-Control':name.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:body);
  }catch{if(!res.headersSent)json(res,503,{error:'UNAVAILABLE',allFreshPass:false});else res.end();}
 });
}
