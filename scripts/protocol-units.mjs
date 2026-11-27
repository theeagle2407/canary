// Convert user-entered token units to uint256 without floating point rounding.
export function toRawUnits(value,decimals){
 const s=String(value).trim(),d=Number(decimals);
 if(!Number.isInteger(d)||d<0||d>36||s.length>116||!/^\d+(?:\.\d+)?$/.test(s))throw Error('Enter a positive token amount.');
 const [whole,frac='']=s.split('.');if(frac.length>d)throw Error(`Use at most ${d} decimal places.`);
 const raw=BigInt(whole+frac.padEnd(d,'0'));if(raw<=0n||raw>=2n**256n)throw Error('Amount outside uint256 range.');return raw.toString();
}
