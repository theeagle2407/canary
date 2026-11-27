// All ids and wei amounts are decimal strings in the persistent journal.
export function nextIds(total,cursor,limit=12){
  total=BigInt(total);cursor=BigInt(cursor);if(total<0n||!Number.isSafeInteger(limit)||limit<1||limit>64)throw Error('Invalid scan bounds');
  if(total===0n)return [];
  if(cursor<1n||cursor>total)cursor=1n;
  const out=[];for(let i=0;i<limit&&BigInt(i)<total;i++){out.push(cursor);cursor=cursor===total?1n:cursor+1n;}return out;
}
export function newJournal(identity){return {version:1,identity,spent:'0',writes:0,cursor:'1',pending:null,last:null};}
export function validateJournal(j,identity){
 if(j.version!==1||JSON.stringify(j.identity)!==JSON.stringify(identity)||!/^\d+$/.test(j.spent)||!/^\d+$/.test(j.cursor)||!Number.isSafeInteger(j.writes)||j.writes<0)throw Error('Journal identity or data mismatch');
 if(j.pending&&(!/^0x[0-9a-f]{64}$/i.test(j.pending.hash)||!/^\d+$/.test(j.pending.id)||!Number.isSafeInteger(j.pending.nonce)||j.pending.nonce<0))throw Error('Invalid pending transaction journal');return j;
}
export function reserveWrite(j,pending,fee,budget,cap){if(j.pending)throw Error('Pending transaction must reconcile first');if(fee<=0n||BigInt(j.spent)+fee>budget||j.writes>=cap)throw Error('Persistent write budget reached');return {...j,spent:(BigInt(j.spent)+fee).toString(),writes:j.writes+1,pending};}
export function settleWrite(j,receipt){if(!j.pending||receipt.hash.toLowerCase()!==j.pending.hash.toLowerCase())throw Error('Receipt does not match journal');return {...j,pending:null,last:{...j.pending,...receipt}};}
