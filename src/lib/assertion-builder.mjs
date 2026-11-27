const UINT=/^uint(?:8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/;
const wordType=t=>t==='bool'||UINT.test(t);
const argType=t=>wordType(t)||t==='address'||t==='bytes32';
export function parseAbi(value){
  const parsed=typeof value==='string'?JSON.parse(value):value;
  const abi=Array.isArray(parsed)?parsed:parsed?.abi;
  if(!Array.isArray(abi)||abi.length>5000)throw Error('Expected an ABI JSON array or artifact with an abi array.');
  return abi;
}
export function supportedFunctions(abi){
  const seen=new Set();return parseAbi(abi).filter(f=>f?.type==='function'&&['view','pure'].includes(f.stateMutability)&&/^[A-Za-z_$][\w$]*$/.test(f.name)&&Array.isArray(f.inputs)&&f.inputs.length<=15&&f.inputs.every(a=>argType(a.type))&&Array.isArray(f.outputs)&&f.outputs.length===1&&wordType(f.outputs[0].type)).map(f=>({...f,signature:`${f.name}(${f.inputs.map(x=>x.type).join(',')})`})).filter(f=>!seen.has(f.signature)&&seen.add(f.signature));
}
export function unsigned(value,type='uint256'){
  if(!/^\d+$/.test(String(value)))throw Error('Enter a non-negative whole number in raw units.');
  const n=BigInt(value);const bits=type==='bool'?1:Number(type.slice(4));
  if((type!=='bool'&&!UINT.test(type))||n>=2n**BigInt(bits))throw Error(`Value outside ${type} range.`);
  return n;
}
export function argument(value,type){
  const s=String(value).trim();if(type==='bool'){if(s==='true'||s==='1')return true;if(s==='false'||s==='0')return false;throw Error('Boolean must be true or false.');}
  if(UINT.test(type))return unsigned(s,type);
  if(type==='address'&&/^0x[0-9a-fA-F]{40}$/.test(s))return s;
  if(type==='bytes32'&&/^0x[0-9a-fA-F]{64}$/.test(s))return s;
  throw Error(`Invalid ${type} argument.`);
}
export function verifyPayload({name,callData,expected,op,maxAge,output='uint256'}){
  if(!name.trim()||new TextEncoder().encode(name.trim()).length>80)throw Error('Name must be 1–80 UTF-8 bytes.');
  if(!/^0x(?:[0-9a-fA-F]{2}){4,512}$/.test(callData))throw Error('Calldata must contain 4–512 bytes.');
  if(!['0','1','2'].includes(String(op)))throw Error('Invalid comparison.');
  if(output==='bool'&&String(op)!=='0')throw Error('Boolean checks use equality.');
  const e=unsigned(expected,output),age=Number(maxAge);
  if(!Number.isInteger(age)||age<60||age>2592000)throw Error('Maximum age must be 60–2592000 seconds.');
  return {name:name.trim(),callData,expected:e.toString(),op:String(op),maxAge:String(age)};
}
export function interpretWord(data,output,op,expected){
  if(!/^0x[0-9a-fA-F]{64}$/.test(data))throw Error('Target must return exactly one 32-byte word.');
  const observed=unsigned(BigInt(data).toString(),output);const e=unsigned(expected,output);
  if(!['0','1','2'].includes(String(op)))throw Error('Invalid comparison.');
  return {observed:observed.toString(),passed:String(op)==='0'?observed===e:String(op)==='1'?observed>=e:observed<=e};
}
const f=(name,inputs,output)=>({type:'function',name,stateMutability:'view',inputs:inputs.map(([name,type])=>({name,type})),outputs:[{type:output}]});
export const templates={token:[f('totalSupply',[],'uint256'),f('balanceOf',[['account','address']],'uint256'),f('decimals',[],'uint8')],pause:[f('paused',[],'bool')],vault:[f('totalAssets',[],'uint256'),f('availableLiquidity',[],'uint256')],nft:[f('balanceOf',[['account','address']],'uint256'),f('isApprovedForAll',[['owner','address'],['operator','address']],'bool')],access:[f('hasRole',[['role','bytes32'],['account','address']],'bool')],multisig:[f('getThreshold',[],'uint256'),f('isOwner',[['owner','address']],'bool')],marketplace:[f('isOpen',[],'bool')]};
