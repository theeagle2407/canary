import {resolveIdentity} from './qie-identity.mjs';
try{console.log(JSON.stringify(await resolveIdentity(process.argv[2]),null,2))}catch(e){console.error('QIE ID unavailable:',e.message);process.exitCode=1}
