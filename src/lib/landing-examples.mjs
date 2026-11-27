// CANARY_MAINNET_ACTIVATION_V1
export const examples = Object.freeze([
  { id:'liquidity', label:'DeFi', title:'Pool liquidity', description:'Monitor a minimum token balance in a liquidity pool.', call:'balanceOf(pool)', operator:'>=', threshold:5000, normal:7200, breach:3100, unit:'tokens', note:'Token balance is not a guarantee of executable liquidity.' },
  { id:'supply', label:'NFTs', title:'Collection supply', description:'Check that the reported supply stays within the collection limit.', call:'totalSupply()', operator:'<=', threshold:10000, normal:8450, breach:10001, unit:'NFTs', note:'Requires a compatible supply function.' },
  { id:'governance', label:'Governance', title:'Signing threshold', description:'Monitor the minimum number of signatures required by a multisig.', call:'getThreshold()', operator:'>=', threshold:3, normal:4, breach:2, unit:'signatures', note:'A threshold alone does not prove governance security.' },
  { id:'access', label:'Access control', title:'Authorized operator', description:'Check whether an account still has a required contract role.', call:'hasRole(role, account)', operator:'==', threshold:1, normal:1, breach:0, unit:'', note:'Requires a compatible access-control function.' },
]);
export function exampleResult(id, breached=false){const x=examples.find(e=>e.id===id);if(!x)throw Error('Unknown example');const observed=breached?x.breach:x.normal;const pass=x.operator==='>='?observed>=x.threshold:x.operator==='<='?observed<=x.threshold:observed===x.threshold;return {...x,observed,pass};}
export function projectReport(config){const id=String(config?.primaryProject||config?.demoProject||'');return /^([1-9][0-9]{0,77})$/.test(id)&&/^0x[0-9a-f]{40}$/i.test(config?.registry||'')?`#/p/${id}`:null;}
