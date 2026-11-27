// Shared visual system. Only stylesheet literals are migrated; no application logic.
export const tokens = Object.freeze({
  bg:'#10110f', chrome:'#151611', panel:'#191a17', raised:'#1e201a', hover:'#292b22', input:'#11130f',
  line:'#31322c', border:'#414137', 'border-strong':'#757263', text:'#f2f0e8', secondary:'#dedbd0', muted:'#aaa99e',
  accent:'#e4c568', 'accent-hover':'#f0d991', 'accent-ink':'#17160e', 'accent-soft':'#29261b', 'accent-border':'#524a32', 'accent-panel':'#212017',
  green:'#8ed4a6', red:'#f3a3a0', 'green-bar':'#638e70', 'red-bar':'#be706b', neutral:'#34372e',
  'success-bg':'#19271d', 'success-line':'#395b43', 'success-text':'#b1e1c6', 'error-bg':'#2c1d1c', 'error-line':'#71434b', 'error-text':'#f3b2b2',
  'code-purple':'#b1a4f5', 'code-blue':'#92b9ed', 'code-gold':'#e5d7a6', 'overlay':'#080907b8', 'shadow':'#0006', 'shadow-soft':'#0003', 'nav-glass':'#10110ff0', 'accent-halo':'#e4c56816', 'hairline':'#ffffff0b'
});
const groups={
  bg:'0e1116 101319 10110f', chrome:'11151c 151611', panel:'12161d 13171e 181915 191a17', raised:'171d26 181e26 181e27 191f28 151a22 1c1d19 1d1e19 1e201a', hover:'202631 202731 23241f 292b22', input:'10151c 11130f 141612',
  line:'282f3a 303844 31322c', border:'333d4a 343d49 394454 485261 414137 494939', 'border-strong':'657180 757263',
  text:'e4e7ec e2e7ef f2f0e8 fff', secondary:'d6dce4 dce2eb c1cad7 c4cbd5 c5cdd9 b9c3d1 dedbd0 c8c4b5 bbb9ae', muted:'939eae a4aebc 8995a5 9ca9bb a1acba 778494 758396 6f7b8b 8391a4 8592a4 a0acbb aab4c3 aab6c5 aaa99e a7a699 b9b6a6',
  accent:'e4c568', 'accent-hover':'efda9a f0d991', 'accent-ink':'17150f 17160e', 'accent-soft':'29261b', 'accent-border':'a38d50 524a32 524b32 6b6040', 'accent-panel':'212017',
  green:'72cda0 8ed4a6', red:'f09393 f3a3a0', 'green-bar':'4a9c76 4b987b 638e70', 'red-bar':'bb6266 b56363 be706b', neutral:'262e3a 454d59',
  'success-bg':'18251e', 'success-line':'385a4a', 'success-text':'b1e1c6', 'error-bg':'2a1c20', 'error-line':'71434b', 'error-text':'f3b2b2',
  'code-purple':'b1a4f5', 'code-blue':'92b9ed', 'code-gold':'e5d7a6', overlay:'05070bb8', shadow:'0006', 'shadow-soft':'0003', 'nav-glass':'10110ff0', 'accent-halo':'e4c56816', hairline:'ffffff0b'
};
const map=new Map(Object.entries(groups).flatMap(([key,values])=>values.split(' ').map(v=>[v,`var(--canary-${key})`])));
const start='/* CANARY DESIGN SYSTEM 21 */', end='/* END CANARY DESIGN SYSTEM 21 */';
export function migrateCss(source,{root=false}={}){
  if(source.includes(start))return source;
  let css=source.replace(/#[0-9a-f]{3,8}\b/gi,match=>map.get(match.slice(1).toLowerCase())??match)
    .replace(/font-family:\s*Inter,system-ui,sans-serif/g,'font-family:var(--canary-sans)')
    .replace(/--mono:'IBM Plex Mono','DejaVu Sans Mono',monospace/g,'--mono:var(--canary-mono)');
  if(root){
    css+='\n'+start+'\n:root{\n'+Object.entries(tokens).map(([k,v])=>`  --canary-${k}:${v};`).join('\n')+`\n  --canary-sans:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\n  --canary-mono:'IBM Plex Mono','DejaVu Sans Mono',monospace;\n  font-family:var(--canary-sans);\n  accent-color:var(--canary-accent);\n}\n`;
    css+=`/* Shared control styling; retain the console's information density. */\n.btn,.ch-button{font-family:var(--canary-sans);border-radius:7px;font-weight:600}\n.btn.outline,.ch-secondary{background:var(--canary-raised);color:var(--canary-text);border-color:var(--canary-border)}\n.btn.outline:hover:not(:disabled),.ch-secondary:hover{background:var(--canary-hover);border-color:var(--canary-border-strong)}\n.btn.primary,.ch-primary{background:var(--canary-accent);color:var(--canary-accent-ink);border-color:var(--canary-accent)}\n.btn.primary:hover:not(:disabled),.ch-primary:hover{background:var(--canary-accent-hover)}\n.panel,.metrics,.infra-metrics,.empty,.reliability-badge{border-radius:8px}\n.nav-item,.project-item,.modal input,.modal select,.assertion-fields textarea,.protocol-input{border-radius:6px}\n.page-title h1,.infra-header h1,.docs h1{letter-spacing:-.035em;font-weight:600}\n.status,.infra-metrics strong .status,.infra-table .status{font-family:var(--canary-sans)}\n.metric strong,.infra-metrics strong,.block-num,.mono,code,pre{font-variant-numeric:tabular-nums}\nbutton,input,select,textarea{font-family:inherit}\n.modal input,.modal select,.assertion-fields textarea,.protocol-input input{font-family:var(--canary-mono)}\n`+end+'\n';
  }
  return css;
}
