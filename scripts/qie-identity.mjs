// Read-only integration with official QIE Wallet MCP. Never signs or broadcasts.
export const MCP_URL='https://mcp.qie.digital/mcp';
export const isAddress=v=>typeof v==='string'&&/^0x[0-9a-f]{40}$/i.test(v);
export const isName=v=>typeof v==='string'&&/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.qie$/i.test(v);
function unwrap(result){
 if(result?.isError)throw Error('QIE ID tool unavailable');
 let data=result?.structuredContent;
 if(!data){const part=result?.content?.find(x=>x.type==='text');if(!part)throw Error('Missing QIE ID result');data=JSON.parse(part.text)}
 if(!data||typeof data!=='object'||data.status!=='ok')throw Error('QIE ID lookup unavailable');
 if(data.chainId!=null&&Number(data.chainId)!==1990)throw Error('Unexpected identity network');
 if(data.network!=null&&data.network!=='mainnet')throw Error('Unexpected identity network');
 return data;
}
async function message(response,id){
 if(!response.ok)throw Error(`QIE ID HTTP ${response.status}`);
 if(response.headers.get('content-type')?.includes('text/event-stream')){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>262144)throw Error('QIE ID response too large');buffer+=decoder.decode(value,{stream:true});let match;while((match=/\r?\n\r?\n/.exec(buffer))){const chunk=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const raw=chunk.split(/\r?\n/).filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trimStart()).join('\n');if(!raw)continue;const obj=JSON.parse(raw);if(obj.id===id)return obj;}}throw Error('Missing MCP response');}finally{await reader.cancel().catch(()=>{})}
 }
 const obj=await response.json();if(obj.id!==id)throw Error('Unexpected MCP response ID');return obj;
}
export async function createMcpClient(fetcher=fetch){
 let session='',protocol='2025-03-26',id=0;
 async function post(method,params,notification=false){
  const current=++id;const body={jsonrpc:'2.0',method,params,...(notification?{}:{id:current})};
  const headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':protocol,...(session?{'Mcp-Session-Id':session}:{})};
  const res=await fetcher(MCP_URL,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(12000),redirect:'error'});
  if(res.headers.get('mcp-session-id'))session=res.headers.get('mcp-session-id');
  if(notification){if(!res.ok)throw Error(`MCP initialization HTTP ${res.status}`);await res.body?.cancel();return}
  const obj=await message(res,current);if(obj.error)throw Error('QIE MCP request failed');return obj.result;
 }
 const init=await post('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'canary',version:'0.2.0'}});
 if(!['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(init?.protocolVersion))throw Error('Unsupported MCP protocol');protocol=init.protocolVersion;
 await post('notifications/initialized',{},true);
 return {call:async(name,args)=>unwrap(await post('tools/call',{name,arguments:{...args,network:'mainnet'}})),close:async()=>{if(session)try{const r=await fetcher(MCP_URL,{method:'DELETE',headers:{'Mcp-Session-Id':session,'MCP-Protocol-Version':protocol},signal:AbortSignal.timeout(2000),redirect:'error'});await r.body?.cancel()}catch{}}};
}
export async function resolveIdentity(query,clientFactory=createMcpClient){
 if(!isAddress(query)&&!isName(query))throw Error('Enter a wallet address or .qie name');
 const client=await clientFactory();
 try{
  if(isName(query)){const name=query.toLowerCase(),f=await client.call('qie_resolve_name',{name});if(f.address===null)return {state:'unresolved',chainId:1990,name};if(!isAddress(f.address))throw Error('Malformed forward lookup');return {state:'resolved',chainId:1990,name,address:f.address};}
  const address=query.toLowerCase(),r=await client.call('qie_reverse_lookup',{address});
  if(r.name===null)return {state:'unresolved',chainId:1990,address};
  if(!isName(r.name))throw Error('Malformed reverse lookup');
  const name=r.name.toLowerCase(),f=await client.call('qie_resolve_name',{name});
  if(!isAddress(f.address)||f.address.toLowerCase()!==address)return {state:'unresolved',chainId:1990,address};
  return {state:'resolved',chainId:1990,address,name};
 }finally{await client.close?.()}
}
