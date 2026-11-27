const ADDRESS=/^0x[0-9a-f]{40}$/i;
export function ownsProject(project,account){return ADDRESS.test(String(account||''))&&String(project?.owner||'').toLowerCase()===account.toLowerCase();}
export function scopedProjects(list,selected,publicId,account){
 const visible=publicId?list.filter(p=>p.id===String(publicId)):account?list.filter(p=>ownsProject(p,account)):[];
 const id=String(publicId||selected||'');
 return {list:visible,active:id?visible.find(p=>p.id===id)||null:visible[0]||null};
}
export function validProjectId(v){return /^[1-9][0-9]{0,77}$/.test(String(v))&&BigInt(v)<2n**256n;}
