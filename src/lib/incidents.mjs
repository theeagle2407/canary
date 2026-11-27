// Reconstruct recorded incidents, not actual outage intervals, from registry events.
export function deriveIncidents(events) {
  const ordered = [...events].sort((a,b)=>a.block-b.block || a.log-b.log);
  const seen = new Set(), open = new Map(), incidents = [];
  for (const e of ordered) {
    const key = `${e.tx}:${e.log}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = String(e.id), existing = open.get(id);
    if (e.kind === 'retire') {
      if (existing) { existing.end = e; existing.state = 'Retired'; open.delete(id); }
      continue;
    }
    if (e.status === 2 || e.status === 3) {
      if (existing) { existing.latest = e; existing.failures++; }
      else { const i = { id, start:e, latest:e, end:null, state:'Open', failures:1 }; incidents.push(i); open.set(id,i); }
    } else if (e.status === 1 && existing) {
      existing.end = e; existing.state = 'Recovered'; open.delete(id);
    }
  }
  return incidents.reverse();
}
export function recordedDuration(start,end) {
  const seconds = Math.max(0, Math.floor(end-start));
  const d = Math.floor(seconds/86400), h = Math.floor(seconds%86400/3600), m = Math.floor(seconds%3600/60), s = seconds%60;
  return d?`${d}d ${h}h ${m}m`:h?`${h}h ${m}m`:m?`${m}m ${s}s`:`${s}s`;
}
