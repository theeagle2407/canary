// Presentation-only edits. Never change deployment identity or wallet guards.
export const replacements = [
 ['src/main.jsx','<small>Chain {cfg.chainId}</small>',''],
 ['src/components/Infrastructure.jsx','<small>Chain {deployment.chainId}</small>',''],
 ['src/components/Notifications.jsx','<small>Chain {deployment.chainId}</small>',''],
 ['src/components/Protocols.jsx','<small>Chain 1990 · read-only</small>','<small>Read-only</small>'],
 ['src/components/ProductLanding.jsx',"{config?.chainId?` · Chain ${config.chainId}`:''}",''],
];
export function cleanLabel(source, before, after) {
 if (!source.includes(before)) {
   if (after && !source.includes(after)) throw Error('Unexpected label source');
   return source;
 }
 if(source.split(before).length!==2) throw Error('Ambiguous network label');
 return source.replace(before,after);
}
