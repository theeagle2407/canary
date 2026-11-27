// Presentation changes only, plus correction of notification explorer links.
export const edits={
 'src/main.jsx':[
  ['<div className="eyebrow"><span className="signal"/> {isPublic?\'PUBLIC REPORT\':cfg.name.toUpperCase()}</div>',"{isPublic&&<div className=\"eyebrow\">PUBLIC REPORT</div>}"],
  ['A passing check is a point-in-time assertion, not an audit or a guarantee of safety.</div></>}', 'A passing check is a point-in-time assertion, not an audit or a guarantee of safety.</div>{isPublic&&<div className="disclaimer">{cfg.name}</div>}</>}'],
 ],
 'src/components/Infrastructure.jsx':[['{deployment.name} · Endpoint health and keeper activity','Endpoint health and keeper activity']],
 'src/components/Notifications.jsx':[
  ['Assertion events · {data?`Project #${data.identity.project}`:deployment.name}',"Assertion events{data?` · Project #${data.identity.project}`:''}"],
  ["href={'https://testnet.qie.digital/tx/'+e.transactionHash}","href={deployment.explorer.replace(/\\/$/,'')+'/tx/'+e.transactionHash}"],
 ],
 'src/components/Protocols.jsx':[
  ['Mainnet observations<small>Read-only</small>','QIE Mainnet<small>Read-only</small>'],
  ['QIE Mainnet · Read-only contract observations','Read-only contract observations'],
  ['Mainnet observations unavailable. Retrying automatically.','Contract observations unavailable. Retrying automatically.'],
  ['Reading mainnet contracts…','Reading contracts…'],
  ['Mainnet registry · Configure a minimum token balance','Configure a minimum token balance'],
  ['Mainnet RPC observations, not CANARY receipts. Templates require a mainnet registry.','RPC observations, not CANARY receipts. Templates require a registry on the observed network.'],
 ],
 'src/components/QieIdentity.jsx':[
  ['`${result.name} · Mainnet ID`',"(Number(chainId)===1990?result.name:`${result.name} · Mainnet ID`)"],
  ["'No mainnet ID found'","(Number(chainId)===1990?'No QIE ID found':'No mainnet ID found')"],
 ],
};
export function applyEdits(file,source){let next=source;for(const [before,after] of edits[file]||[]){if(after.includes(before)&&next.includes(after))continue;const count=next.split(before).length-1;if(count===0&&next.includes(after))continue;if(count!==1)throw Error(`${file}: expected one matching source fragment, found ${count}: ${before}`);next=next.replace(before,()=>after);}return next;}
