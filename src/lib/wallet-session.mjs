// Preserve authorized sessions across routes; invalidate on actual provider changes.
export function watchWalletSession(raw, account, chainId, invalidate) {
  if (!raw || !account) return () => {};
  let active = true;
  const clear = () => { if (active) { active = false; invalidate(); } };
  const accounts = values => {
    if (!Array.isArray(values) || typeof values[0] !== 'string' || values[0].toLowerCase() !== account.toLowerCase()) clear();
  };
  const chain = value => {
    try { if (BigInt(value) !== BigInt(chainId)) clear(); }
    catch { clear(); }
  };
  raw.on?.('accountsChanged', accounts);
  raw.on?.('chainChanged', chain);
  raw.on?.('disconnect', clear);
  // Recheck the provider without prompting. RPC failures alone do not revoke permissions.
  Promise.resolve().then(async () => {
    try {
      const [a, c] = await Promise.all([raw.request({method:'eth_accounts'}), raw.request({method:'eth_chainId'})]);
      if (active) { accounts(a); chain(c); }
    } catch { /* tx() still validates the current account, chain and registry before writing. */ }
  });
  return () => {
    active = false;
    raw.removeListener?.('accountsChanged', accounts);
    raw.removeListener?.('chainChanged', chain);
    raw.removeListener?.('disconnect', clear);
  };
}
