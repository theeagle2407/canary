import {resolveIdentity,isAddress} from './qie-identity.mjs';
export function canaryIdentityPlugin(){
 const cache=new Map(),pending=new Map();
 return {name:'canary-qie-identity',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const u=new URL(req.url||'/','http://localhost');if(u.pathname!=='/api/canary/identity')return next();
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const send=(status,v)=>{res.statusCode=status;res.end(JSON.stringify(v))};
 if(req.method!=='GET')return send(405,{state:'unavailable'});
 const address=u.searchParams.get('address');if(!isAddress(address))return send(400,{state:'unavailable'});
 const key=address.toLowerCase();const old=cache.get(key);if(old&&Date.now()-old.at<60000)return send(200,old.value);
 try{let task=pending.get(key);if(!task){if(pending.size>=2)return send(503,{state:'unavailable'});task=resolveIdentity(key).finally(()=>pending.delete(key));pending.set(key,task)}const value=await task;if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),value});return send(200,value)}catch{return send(503,{state:'unavailable'})}
 })}};
}
