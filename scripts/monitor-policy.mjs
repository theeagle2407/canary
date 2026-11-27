// Only publish status transitions or refresh nearing expiry. Observed values alone
// do not trigger a transaction; they are captured at the next publication.
export function publicationReason(check, liveStatus, now) {
  if (!check.active) return null;
  if (Number(check.status) === 0) return 'initial';
  if (Number(check.status) !== Number(liveStatus)) return 'transition';
  const age = Math.max(0, now - Number(check.checkedAt));
  if (age >= Math.max(1, Math.floor(Number(check.maxAge) * 0.8))) return 'refresh';
  return null;
}
export const statusName = n => ['UNCHECKED', 'PASS', 'FAIL', 'ERROR'][Number(n)] ?? 'UNKNOWN';
