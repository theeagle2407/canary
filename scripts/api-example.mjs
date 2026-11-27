import {createCanaryHttp} from '../sdk/http.mjs';
const client=createCanaryHttp(process.env.CANARY_API_URL||'http://127.0.0.1:8787');
try{
 const result=await client.getProject(process.argv[2]||'1');
 console.log(JSON.stringify(result,null,2));
 console.log(result.allFreshPass?'Configured checks passed at the observed snapshot.':'Required evidence not passing.');
 if(!result.allFreshPass)process.exitCode=2;
}catch(e){console.error(e.code||'ERROR',e.message);process.exitCode=1;}
