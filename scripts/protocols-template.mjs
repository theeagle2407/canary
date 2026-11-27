export function balanceTemplate(token,pair,minimum){
 if(!/^0x[0-9a-f]{40}$/i.test(token)||!/^0x[0-9a-f]{40}$/i.test(pair)||!/^\d{1,78}$/.test(minimum))throw Error('Invalid template input');
 const n=BigInt(minimum);if(n<=0n||n>=2n**256n)throw Error('Minimum outside uint256 range');
 return {chainId:1990,name:'Pool token balance floor (raw units)',target:token,callData:'0x70a08231'+pair.slice(2).toLowerCase().padStart(64,'0'),operator:1,expected:n.toString(),maxAge:900};
}
