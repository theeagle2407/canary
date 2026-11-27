import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url),changes=new Map();
function edit(file,fn){const url=new URL(file,root),old=readFileSync(url,'utf8'),next=fn(old);changes.set(file,{url,old,next});}
function replace(s,from,to){if(s.includes(to))return s;if(!s.includes(from))throw Error('Unexpected source: '+from.slice(0,100));return s.replaceAll(from,to);}
edit('src/main.jsx',s=>{
 if(s.includes('CANARY_PRODUCT_POLISH'))return s;
 const panel=/^\{!isPublic&&project\.id===cfg\.demoProject&&<div className="panel demo-panel"[^\n]*\}\s*$/m;
 if(!panel.test(s))throw Error('Reference controls not found; no changes written');
 s=s.replace(panel,'');
 s="// CANARY_PRODUCT_POLISH\nimport {projectLabel,checkLabel,isReference} from './lib/product-labels.mjs';\n"+s;
 s=replace(s,'{p.name.slice(0,1).toUpperCase()}','{projectLabel(cfg,p.id,p.name).slice(0,1).toUpperCase()}');
 s=replace(s,'{p.name}</span>','{projectLabel(cfg,p.id,p.name)}</span>');
 s=replace(s,"project?.name||'Overview'","projectLabel(cfg,project?.id,project?.name)||'Overview'");
 s=replace(s,'<b>{c.name}</b>','<b>{checkLabel(cfg,project.id,c)}</b>');
 s=replace(s,'<h1>{projectLabel(cfg,project?.id,project?.name)||\'Overview\'}</h1>', '<h1>{projectLabel(cfg,project?.id,project?.name)||\'Overview\'}</h1>{isReference(cfg,project?.id)&&<p className="form-note">Reference contract · no customer funds. Display name only; registry labels remain unchanged.</p>}');
 s=replace(s,'Define on-chain assertions, execute deterministic checks, and publish evidence of contract state.','Monitor the contract conditions your application depends on. Get alerts when they change and publish verifiable on-chain results.');
 s=replace(s,'<small>paused()</small>','<small>totalSupply()</small>');s=replace(s,'<small>uint256 == 0</small>','<small>uint256 ≤ cap</small>');
 s=replace(s,'Use an ABI function such as <code>paused()</code> or <code>reserveUnits()</code>, or paste ABI-encoded calldata. Compare the returned word with an unsigned value.','Import a contract ABI, choose a compatible read function and compare its result with a value. No changes to the target contract are required. Raw calldata is also supported.');
 s=replace(s,'<pre>{`paused() == 0\\nreserveUnits() >= 500`}</pre>','<pre>{`Token: totalSupply() <= cap\\nNFT: balanceOf(account) >= 1\\nMultisig: getThreshold() >= minimum\\nAccess control: hasRole(role, account) == true\\nMarketplace: isOpen() == true`}</pre><p>Illustrative conditions; use only functions your target implements and choose the expected values yourself. Templates are not verified ABIs.</p>');
 s=replace(s,'Canary does not prove a real withdrawal succeeded.','Canary cannot guarantee future behavior, prevent an exploit, or prove that a transaction will succeed.');
 return s;
});
edit('src/components/AssertionForm.jsx',s=>{s=replace(s,"'Bundled demo ABI'","'Reference contract ABI'");s=replace(s,'<option value="vault">Vault / lending</option>','<option value="vault">Vault / lending</option><option value="nft">NFT / membership</option><option value="access">Access control</option><option value="multisig">Multisig</option><option value="marketplace">Marketplace / custom availability</option>');return s;});
edit('src/lib/assertion-builder.mjs',s=>replace(s,"vault:[f('totalAssets',[],'uint256'),f('availableLiquidity',[],'uint256')]}","vault:[f('totalAssets',[],'uint256'),f('availableLiquidity',[],'uint256')],nft:[f('balanceOf',[['account','address']],'uint256'),f('isApprovedForAll',[['owner','address'],['operator','address']],'bool')],access:[f('hasRole',[['role','bytes32'],['account','address']],'bool')],multisig:[f('getThreshold',[],'uint256'),f('isOwner',[['owner','address']],'bool')],marketplace:[f('isOpen',[],'bool')]}"));
edit('src/components/ReliabilityBadge.jsx',s=>{if(!s.includes('import {projectLabel}'))s="import {projectLabel} from '../lib/product-labels.mjs';\n"+s;return replace(s,"<span title={snapshot?.name}>{snapshot?.name||'Project '+projectId}</span>","<span>{projectLabel(config,projectId,snapshot?.name)||'Project '+projectId}</span>");});
edit('scripts/notifications.mjs',s=>s.replaceAll('local demo receiver','local loopback receiver').replaceAll('Local demo receiver','Local loopback receiver').replaceAll("'demo receiver'","'loopback receiver'"));
edit('scripts/start-stack.mjs',s=>s.replaceAll('local demo receiver','local loopback receiver'));
for(const {url,old,next} of changes.values()){if(old===next)continue;const backup=new URL(url.href+'.before-product-polish');if(!existsSync(backup))writeFileSync(backup,old);writeFileSync(url,next);}
console.log('Product polish applied. Original registry labels, deployment and notification journals preserved.');
