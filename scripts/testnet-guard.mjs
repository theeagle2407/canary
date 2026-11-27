export const TESTNET_RPCS = ['https://rpc5testnet.qie.digital','https://rpc4testnet.qie.digital'];
export const TESTNET_CHAIN = 1983n;
export function allowedRpc(url) { return TESTNET_RPCS.includes(url); }
export function feeCeiling(gasLimit, gasPrice, spent, budget, balance, reserve) {
  const maxFee = gasLimit * gasPrice;
  if (gasPrice <= 0n || gasLimit <= 0n) throw Error('Invalid fee quote');
  if (spent + maxFee > budget) throw Error('Session gas budget reached');
  if (balance < maxFee + reserve) throw Error('Wallet reserve reached');
  return maxFee;
}
